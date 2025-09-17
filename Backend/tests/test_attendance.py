import pytest
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from attendance.models import Attendance, AttendanceRule
from monitoring.models import Employee as MonitoringEmployee


@pytest.fixture
def api_client():
    return APIClient()


def authenticate(client: APIClient, username: str, password: str, role: str):
    resp = client.post(
        '/api/auth/login',
        {'username': username, 'password': password, 'role': role},
        format='json',
    )
    assert resp.status_code == 200
    token = resp.data['token']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


@pytest.mark.django_db
def test_check_in_and_check_out_flow(api_client, monkeypatch):
    User = get_user_model()
    user = User.objects.create_user(
        username='alice',
        password='pw',
        roles=['sales'],
        first_name='Alice',
        last_name='Smith',
        email='alice@example.com',
    )

    rules = AttendanceRule.get_solo()
    rules.work_start = time(0, 0)
    rules.grace_minutes = 24 * 60
    rules.save()

    def fake_lookup(ip):
        assert ip == '203.0.113.5'
        return {
            'location_lat': Decimal('25.2048'),
            'location_lng': Decimal('55.2708'),
            'location_address': 'Dubai, UAE',
        }

    monkeypatch.setattr('attendance.utils.lookup_location_for_ip', fake_lookup)

    authenticate(api_client, 'alice', 'pw', 'sales')

    check_in = api_client.post(
        '/api/attendance/check-in/',
        {'notes': 'Starting'},
        format='json',
        REMOTE_ADDR='203.0.113.5',
        HTTP_USER_AGENT='Mozilla/5.0 (Macintosh)',
        HTTP_X_DEVICE_ID='device-123',
    )
    assert check_in.status_code == 201
    record = Attendance.objects.get(id=check_in.data['id'])
    assert record.status == Attendance.STATUS_PRESENT
    assert record.ip_address == '203.0.113.5'
    assert record.device_id == 'device-123'
    assert record.device_info.startswith('Mozilla/5.0')
    assert record.location_address == 'Dubai, UAE'
    assert record.location_lat == Decimal('25.2048')
    assert record.location_lng == Decimal('55.2708')

    earlier = timezone.now() - timedelta(hours=8)
    Attendance.objects.filter(id=record.id).update(check_in=earlier, date=earlier.date())

    check_out = api_client.post(
        '/api/attendance/check-out/',
        {'notes': 'Finished'},
        format='json',
        REMOTE_ADDR='203.0.113.5',
        HTTP_USER_AGENT='Mozilla/5.0 (Macintosh)',
        HTTP_X_DEVICE_ID='device-123',
    )
    assert check_out.status_code == 200
    record.refresh_from_db()
    assert record.check_out is not None
    assert pytest.approx(float(record.total_hours), rel=0.05) == 8.0
    assert 'Finished' in record.notes


@pytest.mark.django_db
def test_attendance_listing_and_filters(api_client):
    User = get_user_model()
    admin = User.objects.create_user(username='admin', password='pw', roles=['admin'], email='admin@example.com')
    employee = User.objects.create_user(username='bob', password='pw', roles=['sales'], first_name='Bob', email='bob@example.com')

    tz = timezone.get_current_timezone()
    first_day = timezone.make_aware(datetime(2024, 1, 2, 9, 0), tz)
    Attendance.objects.create(
        employee=employee,
        check_in=first_day,
        check_out=first_day + timedelta(hours=8),
        date=first_day.date(),
        status=Attendance.STATUS_PRESENT,
    )
    Attendance.objects.create(
        employee=employee,
        check_in=first_day + timedelta(days=1),
        check_out=first_day + timedelta(days=1, hours=8),
        date=(first_day + timedelta(days=1)).date(),
        status=Attendance.STATUS_LATE,
    )

    authenticate(api_client, 'admin', 'pw', 'admin')

    resp = api_client.get('/api/attendance/', {'employee': employee.id})
    assert resp.status_code == 200
    assert len(resp.data) == 2

    resp_search = api_client.get('/api/attendance/', {'search': 'bob'})
    assert resp_search.status_code == 200
    assert len(resp_search.data) >= 2


@pytest.mark.django_db
def test_rules_update_and_summary(api_client):
    User = get_user_model()
    admin = User.objects.create_user(username='admin2', password='pw', roles=['admin'])
    authenticate(api_client, 'admin2', 'pw', 'admin')

    rules_get = api_client.get('/api/attendance/rules/')
    assert rules_get.status_code == 200

    update_payload = {
        'work_start': '08:30:00',
        'work_end': '17:00:00',
        'grace_minutes': 10,
        'standard_work_minutes': 480,
        'overtime_after_minutes': 480,
        'late_penalty_per_minute': '1.50',
        'per_day_deduction': '0.00',
        'overtime_rate_per_minute': '2.00',
        'weekend_days': [5, 6],
    }
    rules_put = api_client.put('/api/attendance/rules/', update_payload, format='json')
    assert rules_put.status_code == 200
    assert rules_put.data['grace_minutes'] == 10

    summary = api_client.get('/api/attendance/summary/')
    assert summary.status_code == 200
    assert 'total_records' in summary.data


@pytest.mark.django_db
def test_payroll_generation(api_client):
    User = get_user_model()
    admin = User.objects.create_user(username='pay-admin', password='pw', roles=['admin'])
    employee = User.objects.create_user(
        username='payroll-user',
        password='pw',
        roles=['sales'],
        first_name='Payroll',
        last_name='User',
        email='payroll@example.com',
    )
    MonitoringEmployee.objects.create(name='Payroll User', email='payroll@example.com', salary=6000)

    rules = AttendanceRule.get_solo()
    rules.work_start = time(9, 0)
    rules.work_end = time(17, 30)
    rules.grace_minutes = 5
    rules.standard_work_minutes = 480
    rules.overtime_after_minutes = 480
    rules.late_penalty_per_minute = 0
    rules.per_day_deduction = 0
    rules.overtime_rate_per_minute = 2
    rules.weekend_days = [5, 6]
    rules.save()

    tz = timezone.get_current_timezone()
    day_one_in = timezone.make_aware(datetime(2024, 1, 2, 9, 0), tz)
    Attendance.objects.create(
        employee=employee,
        check_in=day_one_in,
        check_out=day_one_in + timedelta(hours=8, minutes=30),
        date=day_one_in.date(),
        status=Attendance.STATUS_PRESENT,
    )
    day_two_in = timezone.make_aware(datetime(2024, 1, 3, 9, 20), tz)
    Attendance.objects.create(
        employee=employee,
        check_in=day_two_in,
        check_out=day_two_in + timedelta(hours=8, minutes=40),
        date=day_two_in.date(),
        status=Attendance.STATUS_LATE,
    )

    authenticate(api_client, 'pay-admin', 'pw', 'admin')

    payroll = api_client.get('/api/attendance/payroll/', {'month': '2024-01'})
    assert payroll.status_code == 200
    assert payroll.data['month'] == '2024-01'
    assert payroll.data['working_days'] > 0
    rows = payroll.data['rows']
    assert len(rows) == 1
    row = rows[0]
    assert row['employee']['email'] == 'payroll@example.com'
    assert row['present_days'] == 2
    assert row['total_late_minutes'] == 15
    assert row['total_overtime_minutes'] == 70
    assert row['base_salary'] == 6000.0
    assert row['net_pay'] == pytest.approx(6000.0 + 70 * 2, rel=0.01)
