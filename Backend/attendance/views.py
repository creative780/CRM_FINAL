from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from app.common.net_utils import get_client_ip, resolve_client_hostname

from accounts.permissions import RolePermission
from monitoring.models import Employee as MonitoringEmployee

from .models import Attendance, AttendanceRule
from .serializers import (
    AttendanceRuleSerializer,
    AttendanceSerializer,
    CheckInSerializer,
    CheckOutSerializer,
)
from .utils import build_attendance_metadata


def _format_location(metadata: dict[str, object]) -> str:
    """Create a user-friendly location string from metadata."""

    location = (metadata.get('location_address') or '').strip()
    if location:
        return location

    lat = metadata.get('location_lat')
    lng = metadata.get('location_lng')
    if lat in (None, '') or lng in (None, ''):
        return ''

    return f"{lat}, {lng}"


def _collect_device_meta(request, payload: dict | None = None) -> dict[str, object | None]:
    """Capture device identifiers and resolve the hostname for the client."""

    payload = payload or {}

    ip_candidate = (payload.get('ip_address') or get_client_ip(request) or '').strip()
    ip_address = ip_candidate or None

    device_id_candidate = (
        payload.get('device_id')
        or request.headers.get('X-Device-Id')
        or request.META.get('HTTP_X_DEVICE_ID')
    )
    device_id = str(device_id_candidate).strip() if device_id_candidate else ''
    device_id = device_id or None

    user_agent_candidate = (
        payload.get('device_info')
        or request.headers.get('User-Agent')
        or request.META.get('HTTP_USER_AGENT')
        or ''
    )
    device_info = str(user_agent_candidate)[:255].strip()
    device_info = device_info or None

    # Prefer explicit device name (header/payload) over reverse DNS
    device_name_candidate = (
        (payload.get('device_name') if payload else None)
        or request.headers.get('X-Device-Name')
        or request.META.get('HTTP_X_DEVICE_NAME')
        or None
    )
    if device_name_candidate is not None:
        device_name = str(device_name_candidate).strip()[:255] or None
    else:
        device_name = resolve_client_hostname(ip_address)

    return {
        'ip_address': ip_address,
        'device_id': device_id,
        'device_info': device_info,
        'device_name': device_name,
    }


User = get_user_model()

ALL_ROLES = ['admin', 'sales', 'designer', 'production', 'delivery', 'finance']


def _apply_common_filters(queryset, request):
    employee_id = request.query_params.get('employee')
    if employee_id:
        queryset = queryset.filter(employee_id=employee_id)

    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    if start_date:
        queryset = queryset.filter(date__gte=start_date)
    if end_date:
        queryset = queryset.filter(date__lte=end_date)

    status_filter = request.query_params.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    search_term = request.query_params.get('search') or request.query_params.get('q')
    if search_term:
        queryset = queryset.filter(
            Q(employee__username__icontains=search_term)
            | Q(employee__first_name__icontains=search_term)
            | Q(employee__last_name__icontains=search_term)
        )

    return queryset


class AttendanceCheckInView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ALL_ROLES

    @extend_schema(
        operation_id='attendance_check_in',
        request=CheckInSerializer,
        responses={201: AttendanceSerializer},
        summary='Check in employee',
        description='Record employee check-in time',
        tags=['Attendance'],
    )
    def post(self, request):
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        now = timezone.now()
        today = timezone.localdate(now)

        existing = Attendance.objects.filter(
            employee=request.user,
            date=today,
            check_out__isnull=True,
        ).first()
        if existing:
            return Response(
                {'detail': 'Already checked in today'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        metadata = build_attendance_metadata(request, data)
        device_meta = _collect_device_meta(request, data)
        metadata.update(
            {
                'ip_address': device_meta.get('ip_address'),
                'device_id': device_meta.get('device_id') or '',
                'device_info': device_meta.get('device_info') or '',
                'device_name': device_meta.get('device_name'),
            }
        )

        attendance = Attendance.objects.create(
            employee=request.user,
            check_in=now,
            date=today,
            notes=data.get('notes', ''),
            status=Attendance.determine_status(now),
            **metadata,
        )

        return Response(AttendanceSerializer(attendance).data, status=status.HTTP_201_CREATED)


class AttendanceCheckOutView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ALL_ROLES

    @extend_schema(
        operation_id='attendance_check_out',
        request=CheckOutSerializer,
        responses={200: AttendanceSerializer},
        summary='Check out employee',
        description='Record employee check-out time',
        tags=['Attendance'],
    )
    def post(self, request):
        serializer = CheckOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        now = timezone.now()
        today = timezone.localdate(now)

        attendance = Attendance.objects.filter(
            employee=request.user,
            date=today,
            check_out__isnull=True,
        ).order_by('-check_in').first()

        if not attendance:
            return Response(
                {'detail': 'No active check-in found for today'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        attendance.check_out = now
        if data.get('notes'):
            if attendance.notes:
                attendance.notes = f"{attendance.notes}\n{data['notes']}"
            else:
                attendance.notes = data['notes']

        metadata = build_attendance_metadata(request, data)
        device_meta = _collect_device_meta(request, data)

        for field in ('ip_address', 'device_id', 'device_info', 'device_name'):
            value = device_meta.get(field)
            if field in ('device_id', 'device_info') and value is None:
                value = ''
            setattr(attendance, field, value)

        for field, value in metadata.items():
            if field in ('ip_address', 'device_id', 'device_info', 'device_name'):
                continue
            if value not in (None, ''):
                setattr(attendance, field, value)

        attendance.save()

        return Response(AttendanceSerializer(attendance).data)


class AttendanceContextView(APIView):
    """Return contextual metadata for the authenticated user's device."""

    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ALL_ROLES

    @extend_schema(
        operation_id='attendance_context',
        summary='Get device context for attendance',
        description='Returns the requesting user\'s IP, location and device identifiers',
        responses={200: None},
        tags=['Attendance'],
    )
    def get(self, request):
        metadata = build_attendance_metadata(request)
        device_meta = _collect_device_meta(request)

        ip_address = (device_meta.get('ip_address') or metadata.get('ip_address') or '').strip()
        device_id = (device_meta.get('device_id') or metadata.get('device_id') or '').strip()
        device_info = device_meta.get('device_info') or metadata.get('device_info') or ''
        device_name = (device_meta.get('device_name') or '').strip()

        location = _format_location(metadata)

        fallback_device_name = device_name or device_id

        return Response(
            {
                'ip': ip_address,
                'location': location,
                'deviceId': device_id,
                'deviceName': fallback_device_name,
            }
        )


class AttendanceListView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ['admin']

    @extend_schema(
        operation_id='attendance_list',
        summary='List attendance records',
        description='Get attendance records with optional filtering',
        responses={200: AttendanceSerializer(many=True)},
        tags=['Attendance'],
    )
    def get(self, request):
        queryset = Attendance.objects.select_related('employee')
        queryset = _apply_common_filters(queryset, request)
        queryset = queryset.order_by('-date', '-check_in')
        return Response(AttendanceSerializer(queryset, many=True).data)


class MyAttendanceView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ALL_ROLES

    @extend_schema(
        operation_id='attendance_me',
        summary='Get my attendance',
        description='Get current user attendance records with optional filtering',
        responses={200: AttendanceSerializer(many=True)},
        tags=['Attendance'],
    )
    def get(self, request):
        queryset = Attendance.objects.filter(employee=request.user)
        queryset = _apply_common_filters(queryset, request)
        queryset = queryset.order_by('-date', '-check_in')
        return Response(AttendanceSerializer(queryset, many=True).data)


class AttendanceSummaryView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ['admin']

    @extend_schema(
        operation_id='attendance_summary',
        summary='Attendance summary metrics',
        description='Aggregated metrics for attendance records',
        tags=['Attendance'],
    )
    def get(self, request):
        queryset = Attendance.objects.select_related('employee')
        queryset = _apply_common_filters(queryset, request)

        if not request.user.is_superuser and 'admin' not in (request.user.roles or []):
            queryset = queryset.filter(employee=request.user)

        total_records = queryset.count()
        total_hours = queryset.aggregate(total=Sum('total_hours'))['total'] or Decimal('0')
        present_count = queryset.filter(status=Attendance.STATUS_PRESENT).count()
        late_count = queryset.filter(status=Attendance.STATUS_LATE).count()
        absent_count = queryset.filter(status=Attendance.STATUS_ABSENT).count()
        active_count = queryset.filter(check_out__isnull=True).count()
        avg_hours = float(total_hours) / total_records if total_records else 0.0

        daily = list(
            queryset.values('date').annotate(
                present=Count('id', filter=Q(status=Attendance.STATUS_PRESENT)),
                late=Count('id', filter=Q(status=Attendance.STATUS_LATE)),
                absent=Count('id', filter=Q(status=Attendance.STATUS_ABSENT)),
                total_hours=Sum('total_hours'),
            ).order_by('-date')[:60]
        )

        for item in daily:
            item['total_hours'] = float(item['total_hours'] or 0)

        return Response(
            {
                'total_records': total_records,
                'present': present_count,
                'late': late_count,
                'absent': absent_count,
                'active': active_count,
                'total_hours': float(total_hours),
                'average_hours': round(avg_hours, 2),
                'daily': daily,
            }
        )


class AttendanceRuleView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ['admin']

    @extend_schema(
        operation_id='attendance_rules_get',
        summary='Get attendance rules',
        responses={200: AttendanceRuleSerializer},
        tags=['Attendance'],
    )
    def get(self, request):
        rules = AttendanceRule.get_solo()
        return Response(AttendanceRuleSerializer(rules).data)

    @extend_schema(
        operation_id='attendance_rules_update',
        summary='Update attendance rules',
        request=AttendanceRuleSerializer,
        responses={200: AttendanceRuleSerializer},
        tags=['Attendance'],
    )
    def put(self, request):
        rules = AttendanceRule.get_solo()
        serializer = AttendanceRuleSerializer(rules, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AttendanceEmployeesView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ['admin']

    @extend_schema(
        operation_id='attendance_employees',
        summary='List employees for attendance',
        description='Returns employees with salary data for payroll calculations',
        tags=['Attendance'],
    )
    def get(self, request):
        employees = MonitoringEmployee.objects.all().order_by('name')
        data = [
            {
                'id': emp.id,
                'name': emp.name,
                'email': emp.email,
                'base_salary': float(emp.salary),
            }
            for emp in employees
        ]
        return Response({'employees': data})


class AttendancePayrollView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ['admin']

    @extend_schema(
        operation_id='attendance_payroll',
        summary='Generate payroll summary',
        description='Generates a payroll summary for the provided month',
        tags=['Attendance'],
    )
    def get(self, request):
        month_param = request.query_params.get('month')
        if month_param:
            try:
                year, month = map(int, month_param.split('-'))
            except ValueError:
                return Response({'detail': 'month must be YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            today = timezone.localdate()
            year, month = today.year, today.month

        start = date(year, month, 1)
        end = date(year, month, monthrange(year, month)[1])
        rules = AttendanceRule.get_solo()

        queryset = Attendance.objects.filter(date__range=(start, end)).select_related('employee')
        records_map: dict[tuple[int, date], list[Attendance]] = defaultdict(list)
        for record in queryset:
            records_map[(record.employee_id, record.date)].append(record)

        weekend_days = set(int(d) for d in (rules.weekend_days or []))
        days = []
        cur = start
        while cur <= end:
            js_weekday = (cur.weekday() + 1) % 7
            if js_weekday not in weekend_days:
                days.append(cur)
            cur += timedelta(days=1)

        users = User.objects.filter(id__in={r.employee_id for r in queryset})
        users_by_id = {user.id: user for user in users}
        salaries_by_email = {
            emp.email.lower(): Decimal(emp.salary)
            for emp in MonitoringEmployee.objects.filter(email__in=[u.email for u in users if u.email])
        }

        response_rows = []
        for user_id, user in users_by_id.items():
            base_salary = salaries_by_email.get((user.email or '').lower(), Decimal('0'))
            present_days = 0
            absent_days = 0
            total_late_minutes = 0
            total_overtime_minutes = 0

            for day in days:
                records = records_map.get((user_id, day), [])
                if not records:
                    absent_days += 1
                    continue

                present_days += 1
                records = sorted(records, key=lambda r: r.check_in)
                completed = [r for r in records if r.check_out]
                record = completed[-1] if completed else records[-1]

                local_in = timezone.localtime(record.check_in)
                start_minutes = rules.work_start.hour * 60 + rules.work_start.minute
                check_in_minutes = local_in.hour * 60 + local_in.minute
                late = max(0, check_in_minutes - (start_minutes + rules.grace_minutes))
                total_late_minutes += late

                if record.check_out:
                    local_out = timezone.localtime(record.check_out)
                    worked = (local_out - local_in).total_seconds() // 60
                else:
                    worked = 0
                overtime = max(0, int(worked) - rules.overtime_after_minutes)
                total_overtime_minutes += overtime

            absent_deduction = Decimal(absent_days) * Decimal(rules.per_day_deduction)
            late_deduction = Decimal(total_late_minutes) * Decimal(rules.late_penalty_per_minute)
            overtime_pay = Decimal(total_overtime_minutes) * Decimal(rules.overtime_rate_per_minute)
            net_pay = max(Decimal('0'), base_salary - absent_deduction - late_deduction + overtime_pay)

            response_rows.append(
                {
                    'employee': {
                        'id': user.id,
                        'name': user.get_full_name() or user.username,
                        'email': user.email,
                    },
                    'month': f"{year:04d}-{month:02d}",
                    'working_days': len(days),
                    'present_days': present_days,
                    'absent_days': absent_days,
                    'total_late_minutes': total_late_minutes,
                    'total_overtime_minutes': total_overtime_minutes,
                    'base_salary': float(base_salary),
                    'absent_deduction': float(absent_deduction),
                    'late_deduction': float(late_deduction),
                    'overtime_pay': float(overtime_pay),
                    'net_pay': float(net_pay),
                }
            )

        return Response(
            {
                'month': f"{year:04d}-{month:02d}",
                'working_days': len(days),
                'rows': response_rows,
            }
        )


check_in = AttendanceCheckInView.as_view()
check_out = AttendanceCheckOutView.as_view()
attendance_context = AttendanceContextView.as_view()
attendance_list = AttendanceListView.as_view()
attendance_me = MyAttendanceView.as_view()
attendance_summary = AttendanceSummaryView.as_view()
attendance_rules = AttendanceRuleView.as_view()
attendance_employees = AttendanceEmployeesView.as_view()
attendance_payroll = AttendancePayrollView.as_view()
