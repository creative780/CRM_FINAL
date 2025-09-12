import base64
import re
import uuid
from datetime import datetime
from django.utils import timezone
from django.conf import settings
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import transaction
from .models import Employee, EmployeeActivity, EmployeeAsset
from .serializers import (
    EmployeeSerializer,
    TrackSerializer,
    ScreenshotUploadSerializer,
    ScreenshotDeleteSerializer,
)
from accounts.permissions import RolePermission
from drf_spectacular.utils import extend_schema


class EmployeesListView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    @extend_schema(responses={200: EmployeeSerializer})
    def get(self, request):
        q = request.query_params.get('q', '')
        dept = request.query_params.get('dept')
        status_filter = request.query_params.get('status')
        queryset = Employee.objects.all()
        if q:
            queryset = queryset.filter(name__icontains=q)
        if dept:
            queryset = queryset.filter(department__iexact=dept)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        data = EmployeeSerializer(queryset, many=True).data
        return Response({'employees': data})


class TrackView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    @extend_schema(request=TrackSerializer, responses={200: None})
    def post(self, request):
        serializer = TrackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee_ids = serializer.validated_data['employeeIds']
        delta = serializer.validated_data.get('delta', {})
        action = serializer.validated_data.get('action', '')
        application = serializer.validated_data.get('application', '')
        when = serializer.validated_data['when']
        created = 0
        with transaction.atomic():
            for emp in Employee.objects.filter(id__in=employee_ids):
                EmployeeActivity.objects.create(
                    employee=emp,
                    when=when,
                    action=action,
                    application=application,
                    delta_k=delta.get('k', 0),
                    delta_c=delta.get('c', 0),
                )
                created += 1
        return Response({'created': created})


data_url_pattern = re.compile(r'^data:(?P<mime>image/(jpeg|png));base64,(?P<data>.+)$')


def _save_data_url(image_data_url: str) -> str:
    match = data_url_pattern.match(image_data_url)
    if not match:
        raise ValueError('Invalid image data URL')
    mime = match.group('mime')
    data_b64 = match.group('data')
    raw = base64.b64decode(data_b64)
    if len(raw) > 5 * 1024 * 1024:
        raise ValueError('File too large')
    ext = 'jpg' if 'jpeg' in mime else 'png'
    fname = f"screenshot_{uuid.uuid4().hex}.{ext}"
    # ensure media root exists
    upload_dir = settings.MEDIA_ROOT
    Path(upload_dir).mkdir(parents=True, exist_ok=True)
    full_path = Path(upload_dir) / fname
    with open(full_path, 'wb') as f:
        f.write(raw)
    return f"{settings.MEDIA_URL}{fname}"


class ScreenshotUploadView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    @extend_schema(request=ScreenshotUploadSerializer, responses={200: None})
    def post(self, request):
        serializer = ScreenshotUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee_ids = serializer.validated_data['employeeIds']
        when = serializer.validated_data['when']
        image_data_url = serializer.validated_data['imageDataUrl']
        try:
            url = _save_data_url(image_data_url)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for emp in Employee.objects.filter(id__in=employee_ids):
                EmployeeAsset.objects.create(employee=emp, kind='screenshot', path=url)
                emp.last_screenshot_at = when
                emp.save(update_fields=['last_screenshot_at'])
        return Response({'url': url})


class ScreenshotDeleteView(APIView):
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    @extend_schema(request=ScreenshotDeleteSerializer, responses={200: None})
    def post(self, request):
        serializer = ScreenshotDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        emp_id = serializer.validated_data['employeeId']
        file_path = serializer.validated_data['file']
        try:
            asset = EmployeeAsset.objects.filter(employee_id=emp_id, path=file_path, kind='screenshot', deleted_at__isnull=True).latest('created_at')
        except EmployeeAsset.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        asset.deleted_at = timezone.now()
        asset.save(update_fields=['deleted_at'])
        # Try removing the file if under MEDIA_URL
        media_url = settings.MEDIA_URL.rstrip('/') + '/'
        if file_path.startswith(media_url):
            rel = file_path[len(media_url):]
            from pathlib import Path
            fp = Path(settings.MEDIA_ROOT) / rel
            if fp.exists():
                try:
                    fp.unlink()
                except Exception:
                    pass
        return Response({'deleted': True})

# Create your views here.
