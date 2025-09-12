import base64
import io
from PIL import Image
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


def make_data_url():
    im = Image.new('RGB', (10, 10), color='red')
    buf = io.BytesIO()
    im.save(buf, format='PNG')
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    return f'data:image/png;base64,{b64}'


@pytest.mark.django_db
def test_screenshot_upload_and_delete_flow(tmp_path, settings):
    User = get_user_model()
    admin = User.objects.create_user(username='admin2', password='pw', roles=['admin'])
    c = APIClient()
    login = c.post('/api/auth/login', {'username': 'admin2', 'password': 'pw', 'role': 'admin'}, format='json')
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['token']}")
    # seed one employee
    from monitoring.models import Employee
    emp = Employee.objects.create(name='E', email='e@example.com', department='Ops', status='active')
    # upload screenshot
    url_resp = c.post('/api/screenshot', {'employeeIds': [emp.id], 'when': '2025-01-01T00:00:00Z', 'imageDataUrl': make_data_url()}, format='json')
    assert url_resp.status_code == 200
    url = url_resp.data['url']
    # delete screenshot
    del_resp = c.post('/api/screenshot/delete', {'employeeId': emp.id, 'file': url}, format='json')
    assert del_resp.status_code == 200


@pytest.mark.django_db
def test_delivery_send_code_requires_role():
    User = get_user_model()
    sales = User.objects.create_user(username='s', password='pw', roles=['sales'])
    c = APIClient()
    login = c.post('/api/auth/login', {'username': 's', 'password': 'pw', 'role': 'sales'}, format='json')
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['token']}")
    # Create an order
    order = c.post('/api/orders', {'clientName': 'A', 'productType': 'Flyer'}, format='json')
    oid = order.data['id']
    resp = c.post('/api/delivery/send-code', {'orderId': oid, 'phone': '+100000'}, format='json')
    assert resp.status_code == 403

