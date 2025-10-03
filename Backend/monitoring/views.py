import base64
import re
import uuid
import json
import hashlib
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import (
    Employee, EmployeeActivity, EmployeeAsset, EmployeeSummary,
    Org, Device, DeviceToken, Heartbeat, Screenshot, Session
)
from .serializers import (
    EmployeeSerializer,
    TrackSerializer,
    ScreenshotUploadSerializer,
    ScreenshotDeleteSerializer,
    DeviceSerializer,
    HeartbeatSerializer,
    ScreenshotSerializer,
)
from .authentication import DeviceTokenAuthentication
from .error_handlers import (
    handle_monitoring_errors, log_api_request, log_heartbeat_received,
    log_screenshot_received, log_enrollment_attempt, log_configuration_change,
    validate_device_exists, validate_required_fields, create_error_response,
    create_success_response, log_error_with_context
)
from .auth_utils import (
    create_enrollment_token, verify_enrollment_token, create_device_token,
    authenticate_device_token, check_device_heartbeat_requirement,
    sign_payload, verify_payload_signature
)
from .storage import storage
from accounts.permissions import RolePermission
from drf_spectacular.utils import extend_schema
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


# Legacy views for backward compatibility
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


# New monitoring system views
class EnrollRequestView(APIView):
    """Request enrollment token for device"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        data = request.data
        os_name = data.get('os')
        hostname = data.get('hostname')
        
        if not os_name or not hostname:
            return Response(
                {'detail': 'OS and hostname are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create enrollment token
        org_id = request.user.org_id
        enrollment_token = create_enrollment_token(
            user_id=str(request.user.id),
            org_id=org_id
        )
        
        logger.info(f"Created enrollment token for user {request.user.email}")
        
        return Response({
            'enrollment_token': enrollment_token,
            'expires_in': 900  # 15 minutes
        })


class EnrollCompleteView(APIView):
    """Complete device enrollment with agent"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        data = request.data
        enrollment_token = data.get('enrollment_token')
        os_name = data.get('os')
        hostname = data.get('hostname')
        agent_version = data.get('agent_version')
        
        if not all([enrollment_token, os_name, hostname, agent_version]):
            return Response(
                {'detail': 'All fields are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify enrollment token
            payload = verify_enrollment_token(enrollment_token)
            user_id = payload['user_id']
            org_id = payload.get('org_id')
            
            user = User.objects.get(id=user_id)
            
            # Get IP from request body or REMOTE_ADDR
            ip = data.get('ip') or request.META.get('REMOTE_ADDR')
            
            # Create or update device
            # First, try to find existing device with same hostname and user
            existing_devices = Device.objects.filter(
                current_user=user,
                hostname=hostname
            )
            
            if existing_devices.exists():
                # Use the most recent device
                device = existing_devices.order_by('-created_at').first()
                created = False
                
                # Update existing device
                device.os = os_name
                device.agent_version = agent_version
                device.ip = ip  # Update IP on re-enrollment
                device.save()
            else:
                # Create new device
                device = Device.objects.create(
                    current_user=user,
                    hostname=hostname,
                    os=os_name,
                    agent_version=agent_version,
                    org=org_id,
                    status='OFFLINE',
                    ip=ip
                )
                created = True
            
            
            # Create device token
            device_token = create_device_token(device)
            
            logger.info(f"Device enrolled: {device.id} for user {user.email}")
            
            return Response({
                'device_id': device.id,
                'device_token': device_token.secret,
                'expires_at': device_token.expires_at.isoformat()
            })
            
        except AuthenticationFailed as e:
            return Response(
                {'detail': str(e)}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class HeartbeatView(APIView):
    """Device heartbeat endpoint"""
    authentication_classes = [DeviceTokenAuthentication]
    permission_classes = [permissions.AllowAny]
    
    @handle_monitoring_errors
    @log_api_request
    def post(self, request):
        # Device is already authenticated by DeviceTokenAuthentication
        device = request.auth  # This is the device object from authentication
        
        # Handle both DRF and Django request objects
        if hasattr(request, 'data'):
            data = request.data
        else:
            # Fallback for Django WSGIRequest (for testing)
            import json
            try:
                data = json.loads(request.body.decode('utf-8')) if request.body else {}
            except (json.JSONDecodeError, UnicodeDecodeError):
                data = {}
        
        # Log heartbeat reception
        log_heartbeat_received(device.id, {
            'cpu_percent': data.get('cpu_percent', data.get('cpu', 0.0)),
            'mem_percent': data.get('mem_percent', data.get('mem', 0.0)),
            'active_window': data.get('active_window', data.get('activeWindow')),
            'is_locked': data.get('is_locked', data.get('isLocked', False)),
        })
        
        cpu_percent = data.get('cpu_percent', data.get('cpu', 0.0))
        mem_percent = data.get('mem_percent', data.get('mem', 0.0))
        active_window = data.get('active_window', data.get('activeWindow'))
        is_locked = data.get('is_locked', data.get('isLocked', False))
        
        # Get IP from request body (sent by agent) or fallback to REMOTE_ADDR
        ip = data.get('ip') or request.META.get('REMOTE_ADDR')
        
        # Phase 2: Enhanced monitoring data
        keystroke_count = data.get('keystroke_count', 0)
        mouse_click_count = data.get('mouse_click_count', 0)
        productivity_score = data.get('productivity_score', 0.0)
        keystroke_rate_per_minute = data.get('keystroke_rate_per_minute', 0.0)
        click_rate_per_minute = data.get('click_rate_per_minute', 0.0)
        active_time_minutes = data.get('active_time_minutes', 0.0)
        session_duration_minutes = data.get('session_duration_minutes', 0.0)
        top_applications = data.get('top_applications', {})
        idle_alert = data.get('idle_alert', False)
        
        # Create heartbeat record with user snapshots and enhanced data
        try:
            user_id_snapshot = None
            if device.current_user and hasattr(device.current_user, 'id'):
                user_id_snapshot = device.current_user.id
            elif hasattr(device, 'current_user_id') and device.current_user_id:
                user_id_snapshot = device.current_user_id
            
            heartbeat = Heartbeat.objects.create(
                device=device,
                cpu_percent=cpu_percent,
                mem_percent=mem_percent,
                active_window=active_window,
                is_locked=is_locked,
                ip=ip,
                user_id_snapshot=user_id_snapshot,
                user_name_snapshot=getattr(device, 'current_user_name', None),
                user_role_snapshot=getattr(device, 'current_user_role', None),
                # Phase 2: Enhanced fields (will be ignored if not in model)
                keystroke_count=keystroke_count,
                mouse_click_count=mouse_click_count,
                productivity_score=productivity_score,
                keystroke_rate_per_minute=keystroke_rate_per_minute,
                click_rate_per_minute=click_rate_per_minute,
                active_time_minutes=active_time_minutes,
                session_duration_minutes=session_duration_minutes,
                top_applications=top_applications,
                idle_alert=idle_alert
            )
        except Exception as e:
            logger.error(f"Failed to create heartbeat: {e}")
            return Response(
                {'detail': 'Failed to create heartbeat record'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Handle idle alert if present
        if idle_alert:
            # Create idle alert record if IdleAlert model exists
            try:
                from .models import IdleAlert
                IdleAlert.objects.create(
                    device=device,
                    idle_duration_minutes=30  # Default threshold
                )
            except ImportError:
                # IdleAlert model doesn't exist yet, skip
                pass
        
        # Update device status
        device.last_heartbeat = timezone.now()
        device.ip = ip
        
        if is_locked:
            device.status = 'IDLE'
        else:
            device.status = 'ONLINE'
        
        device.save()
        
        # Emit WebSocket events for real-time updates (optional - gracefully handle Redis connection issues)
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            if channel_layer:
                # Send to monitoring group
                async_to_sync(channel_layer.group_send)(
                    'monitoring_updates',
                    {
                        'type': 'heartbeat_update',
                        'device_id': device.id,
                        'heartbeat': {
                            'cpu_percent': cpu_percent,
                            'mem_percent': mem_percent,
                            'active_window': active_window,
                            'is_locked': is_locked,
                            'keystroke_count': keystroke_count,
                            'mouse_click_count': mouse_click_count,
                            'productivity_score': productivity_score,
                            'timestamp': timezone.now().isoformat()
                        }
                    }
                )
                
                # Send to device-specific group
                async_to_sync(channel_layer.group_send)(
                    f'device_{device.id}',
                    {
                        'type': 'device_heartbeat',
                        'heartbeat': {
                            'cpu_percent': cpu_percent,
                            'mem_percent': mem_percent,
                            'active_window': active_window,
                            'is_locked': is_locked,
                            'keystroke_count': keystroke_count,
                            'mouse_click_count': mouse_click_count,
                            'productivity_score': productivity_score,
                            'timestamp': timezone.now().isoformat()
                        }
                    }
                )
        except Exception as e:
            # Log the error but don't fail the heartbeat
            logger.warning(f"WebSocket event emission failed (Redis not available?): {e}")
        
        logger.debug(f"Heartbeat received from device {device.id}")
        
        return Response({'ok': True})


class ScreenshotIngestView(APIView):
    """Screenshot ingestion endpoint"""
    authentication_classes = [DeviceTokenAuthentication]
    permission_classes = [permissions.AllowAny]
    
    @handle_monitoring_errors
    @log_api_request
    def post(self, request):
        # Device is already authenticated by DeviceTokenAuthentication
        device = request.auth  # This is the device object from authentication
        
        # Handle both DRF and Django request objects
        if hasattr(request, 'data'):
            data = request.data
        else:
            # Fallback for Django WSGIRequest (for testing)
            import json
            try:
                data = json.loads(request.body.decode('utf-8')) if request.body else {}
            except (json.JSONDecodeError, UnicodeDecodeError):
                data = {}
        
        image_data = data.get('image')  # base64 encoded
        
        # Log screenshot reception
        log_screenshot_received(device.id, "screenshot_upload", len(image_data) if image_data else 0)
        width = data.get('width')
        height = data.get('height')
        taken_at = data.get('taken_at') or data.get('takenAt')  # Handle both field names
        
        if not all([image_data, width, height]):
            return Response(
                {'detail': 'Image data, width, and height are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            
            # Calculate SHA256 for deduplication
            sha256_hash = hashlib.sha256(image_bytes).hexdigest()
            
            # Check if screenshot already exists
            if Screenshot.objects.filter(sha256=sha256_hash).exists():
                return Response({'ok': True, 'duplicate': True})
            
            # Generate storage keys
            date_str = timezone.now().strftime('%Y/%m/%d')
            org_prefix = device.org_id if device.org_id else "default"
            blob_key = f"{org_prefix}/{device.id}/{date_str}/{sha256_hash}.jpg"
            thumb_key = f"{org_prefix}/{device.id}/{date_str}/{sha256_hash}-thumb.jpg"
            
            # Store original image
            import asyncio
            asyncio.run(storage.put(blob_key, image_bytes, 'image/jpeg'))
            
            # Create screenshot record with user snapshots
            try:
                user_id_snapshot = None
                if device.current_user and hasattr(device.current_user, 'id'):
                    user_id_snapshot = device.current_user.id
                elif hasattr(device, 'current_user_id') and device.current_user_id:
                    user_id_snapshot = device.current_user_id
                
                screenshot = Screenshot.objects.create(
                    device=device,
                    blob_key=blob_key,
                    thumb_key=thumb_key,
                    width=width,
                    height=height,
                    sha256=sha256_hash,
                    user_id_snapshot=user_id_snapshot,
                    user_name_snapshot=getattr(device, 'current_user_name', None),
                    user_role_snapshot=getattr(device, 'current_user_role', None),
                )
            except Exception as e:
                logger.error(f"Failed to create screenshot: {e}")
                return Response(
                    {'detail': 'Failed to create screenshot record'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Generate thumbnail
            try:
                from PIL import Image
                import io
                
                # Create thumbnail from original image
                img = Image.open(io.BytesIO(image_bytes))
                img.thumbnail((300, 200), Image.Resampling.LANCZOS)
                
                # Save thumbnail
                thumb_buffer = io.BytesIO()
                img.save(thumb_buffer, format='JPEG', quality=80)
                thumb_data = thumb_buffer.getvalue()
                
                # Store thumbnail
                asyncio.run(storage.put(thumb_key, thumb_data, 'image/jpeg'))
                
            except Exception as e:
                logger.error(f"Failed to generate thumbnail: {e}")
                # Continue without thumbnail
            
            # Emit WebSocket events for real-time updates (optional - gracefully handle Redis connection issues)
            try:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                
                channel_layer = get_channel_layer()
                if channel_layer:
                    # Send to monitoring group
                    async_to_sync(channel_layer.group_send)(
                        'monitoring_updates',
                        {
                            'type': 'screenshot_update',
                            'device_id': device.id,
                            'screenshot': {
                                'thumb_url': f'/api/monitoring/files/{thumb_key}',
                                'taken_at': timezone.now().isoformat(),
                                'width': width,
                                'height': height
                            }
                        }
                    )
                    
                    # Send to device-specific group
                    async_to_sync(channel_layer.group_send)(
                        f'device_{device.id}',
                        {
                            'type': 'device_screenshot',
                            'screenshot': {
                                'thumb_url': f'/api/monitoring/files/{thumb_key}',
                                'taken_at': timezone.now().isoformat(),
                                'width': width,
                                'height': height
                            }
                        }
                    )
            except Exception as e:
                # Log the error but don't fail the screenshot ingestion
                logger.warning(f"WebSocket event emission failed (Redis not available?): {e}")
            
            logger.info(f"Screenshot ingested for device {device.id}")
            
            return Response({'ok': True})
            
        except Exception as e:
            logger.error(f"Failed to ingest screenshot: {e}")
            return Response(
                {'detail': 'Failed to process screenshot'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminDevicesListView(APIView):
    """List devices for admin monitoring"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    
    def _get_authenticated_url(self, file_path, request):
        """Generate URL for file access"""
        return f"/api/files/{file_path}"
    
    def get(self, request):
        # Get query parameters
        status_filter = request.GET.get('status')
        org_filter = request.GET.get('org')
        os_filter = request.GET.get('os')
        search_query = request.GET.get('q')
        
        # Build queryset
        devices = Device.objects.select_related('current_user').prefetch_related(
            'heartbeats', 'screenshots'
        ).all()
        
        if status_filter:
            devices = devices.filter(status=status_filter)
        
        if org_filter:
            devices = devices.filter(org_id=org_filter)
        
        if os_filter:
            devices = devices.filter(os__icontains=os_filter)
        
        if search_query:
            from django.db import models
            devices = devices.filter(
                models.Q(hostname__icontains=search_query) |
                models.Q(current_user__email__icontains=search_query) |
                models.Q(current_user__first_name__icontains=search_query) |
                models.Q(current_user__last_name__icontains=search_query)
            )
        
        # Serialize devices with latest heartbeat and screenshot
        device_data = []
        for device in devices:
            latest_heartbeat = device.heartbeats.order_by('-created_at').first()
            latest_screenshot = device.screenshots.order_by('-taken_at').first()
            
            device_info = {
                'id': device.id,
                'hostname': device.hostname,
                'os': device.os,
                'agent_version': getattr(device, 'agent_version', None),
                'status': device.status,
                'ip': device.ip,
                'enrolled_at': device.enrolled_at.isoformat(),
                'last_heartbeat': device.last_heartbeat.isoformat() if device.last_heartbeat else None,
                'screenshot_freq_sec': getattr(device, 'screenshot_freq_sec', 30),
                'user': {
                    'id': device.current_user.id if device.current_user else None,
                    'email': device.current_user.email if device.current_user else None,
                    'name': device.current_user_name or (f"{device.current_user.first_name} {device.current_user.last_name}".strip() if device.current_user else None)
                } if device.current_user else None,
                'current_user': {
                    'id': device.current_user.id if device.current_user else None,
                    'email': device.current_user.email if device.current_user else None,
                    'name': device.current_user_name or (f"{device.current_user.first_name} {device.current_user.last_name}".strip() if device.current_user else None),
                    'role': device.current_user_role
                } if device.current_user else None,
                'org': {
                    'id': device.org.id,
                    'name': device.org.name
                } if device.org else None,
                'latest_heartbeat': {
                    'cpu_percent': latest_heartbeat.cpu_percent,
                    'mem_percent': latest_heartbeat.mem_percent,
                    'active_window': latest_heartbeat.active_window,
                    'is_locked': latest_heartbeat.is_locked,
                    'created_at': latest_heartbeat.created_at.isoformat(),
                    # Phase 2: Enhanced monitoring data
                    'keystroke_count': getattr(latest_heartbeat, 'keystroke_count', 0),
                    'mouse_click_count': getattr(latest_heartbeat, 'mouse_click_count', 0),
                    'productivity_score': getattr(latest_heartbeat, 'productivity_score', 0.0),
                    'keystroke_rate_per_minute': getattr(latest_heartbeat, 'keystroke_rate_per_minute', 0.0),
                    'click_rate_per_minute': getattr(latest_heartbeat, 'click_rate_per_minute', 0.0),
                    'active_time_minutes': getattr(latest_heartbeat, 'active_time_minutes', 0.0),
                    'session_duration_minutes': getattr(latest_heartbeat, 'session_duration_minutes', 0.0),
                    'top_applications': getattr(latest_heartbeat, 'top_applications', {}),
                    'idle_alert': getattr(latest_heartbeat, 'idle_alert', False)
                } if latest_heartbeat else None,
                'latest_screenshot': {
                    'thumb_url': self._get_authenticated_url(latest_screenshot.thumb_key, request),
                    'taken_at': latest_screenshot.taken_at.isoformat()
                } if latest_screenshot else None,
                'latest_thumb': latest_screenshot.thumb_key if latest_screenshot else None
            }
            device_data.append(device_info)
        
        return Response({'devices': device_data})


class AdminDeviceDetailView(APIView):
    """Get detailed device information"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    
    def get(self, request, device_id):
        try:
            device = Device.objects.select_related('current_user').prefetch_related(
                'heartbeats', 'screenshots'
            ).get(id=device_id)
        except Device.DoesNotExist:
            return Response(
                {'detail': 'Device not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get paginated screenshots
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        offset = (page - 1) * page_size
        
        screenshots = device.screenshots.order_by('-taken_at')[offset:offset + page_size]
        heartbeats = device.heartbeats.order_by('-created_at')[:100]  # Last 100 heartbeats
        
        device_data = {
            'id': device.id,
            'hostname': device.hostname,
            'os': device.os,
            'agent_version': getattr(device, 'agent_version', None),
            'status': device.status,
            'ip': device.ip,
            'enrolled_at': device.enrolled_at.isoformat(),
            'last_heartbeat': device.last_heartbeat.isoformat() if device.last_heartbeat else None,
            'screenshot_freq_sec': getattr(device, 'screenshot_freq_sec', 30),
            'user': {
                'id': device.current_user.id if device.current_user else None,
                'email': device.current_user.email if device.current_user else None,
                'name': device.current_user_name or (f"{device.current_user.first_name} {device.current_user.last_name}".strip() if device.current_user else None)
            } if device.current_user else None,
            'current_user': {
                'id': device.current_user.id if device.current_user else None,
                'email': device.current_user.email if device.current_user else None,
                'name': device.current_user_name or (f"{device.current_user.first_name} {device.current_user.last_name}".strip() if device.current_user else None),
                'role': device.current_user_role
            } if device.current_user else None,
            'org': {
                'id': device.org.id,
                'name': device.org.name
            } if device.org else None,
            'screenshots': [
                {
                    'id': s.id,
                    'taken_at': s.taken_at.isoformat(),
                    'width': s.width,
                    'height': s.height,
                    'thumb_url': f"/monitoring/files/{s.thumb_key}",
                    'full_url': f"/monitoring/files/{s.blob_key}"
                }
                for s in screenshots
            ],
            'heartbeats': [
                {
                    'id': h.id,
                    'cpu_percent': h.cpu_percent,
                    'mem_percent': h.mem_percent,
                    'active_window': h.active_window,
                    'is_locked': h.is_locked,
                    'ip': h.ip,
                    'created_at': h.created_at.isoformat()
                }
                for h in heartbeats
            ]
        }
        
        return Response(device_data)




class AdminScreenshotsView(APIView):
    """Admin endpoint to view employee screenshots"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    
    def _get_authenticated_url(self, file_path, request):
        """Generate URL for file access"""
        return f"/api/files/{file_path}"
    
    def get(self, request):
        """Get screenshots for all devices or a specific device"""
        try:
            device_id = request.query_params.get('device_id')
            limit = int(request.query_params.get('limit', 50))
            offset = int(request.query_params.get('offset', 0))
            
            # Build query
            screenshots_query = Screenshot.objects.select_related('device', 'device__current_user')
            
            if device_id:
                screenshots_query = screenshots_query.filter(device_id=device_id)
            
            # Order by most recent first
            screenshots_query = screenshots_query.order_by('-taken_at')
            
            # Apply pagination
            screenshots = screenshots_query[offset:offset + limit]
            
            # Serialize with device and user info
            result = []
            for screenshot in screenshots:
                # Use current_user if available, otherwise use user_name_snapshot
                user_name = "Unknown User"
                user_email = "unknown@example.com"
                
                if screenshot.device.current_user:
                    user_name = f"{screenshot.device.current_user.first_name} {screenshot.device.current_user.last_name}".strip()
                    user_email = screenshot.device.current_user.email
                elif screenshot.user_name_snapshot:
                    user_name = screenshot.user_name_snapshot
                    user_email = f"user_{screenshot.user_id_snapshot}@example.com" if screenshot.user_id_snapshot else "unknown@example.com"
                
                result.append({
                    'id': screenshot.id,
                    'device_id': screenshot.device.id,
                    'device_name': screenshot.device.hostname,
                    'user_name': user_name,
                    'user_email': user_email,
                    'width': screenshot.width,
                    'height': screenshot.height,
                    'created_at': screenshot.taken_at.isoformat(),
                    'thumb_key': screenshot.thumb_key,
                    'blob_key': screenshot.blob_key,
                'thumb_url': self._get_authenticated_url(screenshot.thumb_key, request),
                'image_url': self._get_authenticated_url(screenshot.blob_key, request),
                })
            
            logger.info(f"Returning {len(result)} screenshots for device {device_id}")
            
            return Response({
                'screenshots': result,
                'total': screenshots_query.count(),
                'limit': limit,
                'offset': offset
            })
            
        except Exception as e:
            logger.error(f"Error in AdminScreenshotsView: {e}")
            return Response(
                {'detail': 'Failed to fetch screenshots'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminEmployeeActivityView(APIView):
    """Admin endpoint to view employee activity summary"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    
    def get(self, request):
        """Get activity summary for all employees"""
        # Get recent heartbeats (last 24 hours)
        from django.utils import timezone
        from datetime import timedelta
        
        recent_threshold = timezone.now() - timedelta(hours=24)
        
        # Get all devices with recent activity
        devices = Device.objects.filter(
            last_heartbeat__gte=recent_threshold
        ).select_related('current_user').prefetch_related('heartbeats', 'screenshots')
        
        result = []
        for device in devices:
            # Get recent heartbeats
            recent_heartbeats = device.heartbeats.filter(created_at__gte=recent_threshold)
            
            # Get recent screenshots
            recent_screenshots = device.screenshots.filter(taken_at__gte=recent_threshold)
            
            # Calculate activity metrics
            total_heartbeats = recent_heartbeats.count()
            total_screenshots = recent_screenshots.count()
            
            # Get latest activity
            latest_heartbeat = recent_heartbeats.order_by('-created_at').first()
            latest_screenshot = recent_screenshots.order_by('-taken_at').first()
            
            result.append({
                'device_id': device.id,
                'device_name': device.hostname,
                'user_name': f"{device.current_user.first_name} {device.current_user.last_name}".strip() if device.current_user else None,
                'user_email': device.current_user.email if device.current_user else None,
                'status': device.status,
                'last_heartbeat': device.last_heartbeat.isoformat() if device.last_heartbeat else None,
                'total_heartbeats_24h': total_heartbeats,
                'total_screenshots_24h': total_screenshots,
                'latest_cpu': latest_heartbeat.cpu_percent if latest_heartbeat else None,
                'latest_memory': latest_heartbeat.mem_percent if latest_heartbeat else None,
                'latest_window': latest_heartbeat.active_window if latest_heartbeat else None,
                'latest_screenshot': latest_screenshot.taken_at.isoformat() if latest_screenshot else None,
            })
        
        return Response({
            'employees': result,
            'total_active': len(result)
        })


class AgentContextView(APIView):
    """Agent context endpoint - returns current user binding for device"""
    authentication_classes = [DeviceTokenAuthentication]
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        """Get current user context for this device"""
        device = request.auth  # Device object from authentication
        
        if device.current_user:
            context = {
                'user': {
                    'id': device.current_user.id,
                    'name': device.current_user_name,
                    'role': device.current_user_role,
                }
            }
        else:
            context = {'user': None}
        
        return Response(context)


class AgentDownloadView(APIView):
    """Agent installer download endpoint"""
    permission_classes = [permissions.AllowAny]  # Allow anyone to download the agent
    
    def get(self, request):
        """Download the agent installer for the detected OS"""
        import os
        from django.http import FileResponse, Http404, HttpResponse
        from django.conf import settings
        
        # Get OS from user agent
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        
        # Determine the correct installer file
        if 'win' in user_agent:
            filename = 'crm-monitoring-agent.exe'
            content_type = 'application/octet-stream'
        elif 'mac' in user_agent:
            filename = 'agent-installer.sh'
            content_type = 'application/x-sh'
        elif 'linux' in user_agent:
            filename = 'agent-installer.sh'
            content_type = 'application/x-sh'
        else:
            # Default to Windows for unknown OS
            filename = 'crm-monitoring-agent.exe'
            content_type = 'application/octet-stream'
        
        # Path to the agent installer
        agent_dir = os.path.join(settings.BASE_DIR, '..', 'agent', 'dist')
        
        # Check if the specific installer exists
        file_path = os.path.join(agent_dir, filename)
        
        if not os.path.exists(file_path):
            # If the specific OS installer doesn't exist, create a generic installer script
            if filename.endswith('.sh'):
                return self._create_installer_script(request, filename)
            else:
                # Try the Windows executable
                file_path = os.path.join(agent_dir, 'crm-monitoring-agent.exe')
                if not os.path.exists(file_path):
                    raise Http404("Agent installer not found")
        
        # Serve the file
        response = FileResponse(
            open(file_path, 'rb'),
            content_type=content_type
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = os.path.getsize(file_path)
        
        return response
    
    def _create_installer_script(self, request, filename):
        """Create a generic installer script for Unix-like systems"""
        import os
        from django.http import HttpResponse
        
        # Get enrollment token from query params
        enrollment_token = request.GET.get('token', '')
        
        # Get server URL from request
        server_url = f"{request.scheme}://{request.get_host()}"
        
        if 'mac' in request.META.get('HTTP_USER_AGENT', '').lower():
            script_content = f"""#!/bin/bash
# CRM Monitoring Agent Installer for macOS

echo "Installing CRM Monitoring Agent for macOS..."

# Create installation directory
INSTALL_DIR="$HOME/Library/Application Support/CRM_Agent"
mkdir -p "$INSTALL_DIR"

# Download Python dependencies
echo "Installing Python dependencies..."
pip3 install requests mss psutil Pillow websocket-client

# Create agent script
cat > "$INSTALL_DIR/agent.py" << 'EOF'
import requests
import time
import platform
import socket
import json
import base64
import hashlib
from datetime import datetime
from pathlib import Path

class MonitoringAgent:
    def __init__(self, server_url="http://localhost:8000"):
        self.server_url = server_url
        self.device_token = None
        self.device_id = None
        self.config_file = Path.home() / ".creative_connect_agent_config.json"
        
    def enroll_device(self, enrollment_token):
        try:
            response = requests.post(
                f"{server_url}/api/enroll/complete",
                json={{
                    "enrollment_token": enrollment_token,
                    "os": platform.system(),
                    "hostname": socket.gethostname(),
                    "agent_version": "1.0.0"
                }},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.device_token = data.get("device_token")
                self.device_id = data.get("device_id")
                print(f"Device enrolled successfully! Device ID: {{self.device_id}}")
                return True
            else:
                print(f"Enrollment failed: {{response.status_code}}")
                return False
        except Exception as e:
            print(f"Enrollment error: {{e}}")
            return False
    
    def send_heartbeat(self):
        if not self.device_token:
            return False
        try:
            response = requests.post(
                f"{server_url}/api/ingest/heartbeat",
                headers={{"Authorization": f"Bearer {{self.device_token}}", "Content-Type": "application/json"}},
                json={{"cpu": 0.0, "mem": 0.0, "activeWindow": "Unknown", "isLocked": False, "timestamp": time.time()}},
                timeout=10
            )
            return response.status_code == 200
        except:
            return False
    
    def run(self, enrollment_token=None):
        if not self.device_token and enrollment_token:
            if not self.enroll_device(enrollment_token):
                return False
        
        if not self.device_token:
            print("No device token available. Please enroll first.")
            return False
        
        print(f"Agent running for device {{self.device_id}}")
        try:
            while True:
                self.send_heartbeat()
                time.sleep(30)
        except KeyboardInterrupt:
            print("Agent stopped by user")
        return True

if __name__ == "__main__":
    import sys
    agent = MonitoringAgent()
    agent.run("{enrollment_token}")
EOF

# Make agent executable
chmod +x "$INSTALL_DIR/agent.py"

# Create LaunchAgent plist for auto-start
cat > "$HOME/Library/LaunchAgents/com.company.crmagent.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.company.crmagent</string>
    <key>ProgramArguments</key>
    <array>
        <string>python3</string>
        <string>$INSTALL_DIR/agent.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Load the LaunchAgent
launchctl load "$HOME/Library/LaunchAgents/com.company.crmagent.plist"

echo "Installation completed!"
echo "Agent installed to: $INSTALL_DIR"
echo "Auto-start enabled via LaunchAgent"
"""
        else:
            script_content = f"""#!/bin/bash
# CRM Monitoring Agent Installer for Linux

echo "Installing CRM Monitoring Agent for Linux..."

# Create installation directory
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install --user requests mss psutil Pillow websocket-client

# Create agent script
cat > "$INSTALL_DIR/crm-agent" << 'EOF'
import requests
import time
import platform
import socket
import json
import base64
import hashlib
from datetime import datetime
from pathlib import Path

class MonitoringAgent:
    def __init__(self, server_url="http://localhost:8000"):
        self.server_url = server_url
        self.device_token = None
        self.device_id = None
        self.config_file = Path.home() / ".creative_connect_agent_config.json"
        
    def enroll_device(self, enrollment_token):
        try:
            response = requests.post(
                f"{server_url}/api/enroll/complete",
                json={{
                    "enrollment_token": enrollment_token,
                    "os": platform.system(),
                    "hostname": socket.gethostname(),
                    "agent_version": "1.0.0"
                }},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.device_token = data.get("device_token")
                self.device_id = data.get("device_id")
                print(f"Device enrolled successfully! Device ID: {{self.device_id}}")
                return True
            else:
                print(f"Enrollment failed: {{response.status_code}}")
                return False
        except Exception as e:
            print(f"Enrollment error: {{e}}")
            return False
    
    def send_heartbeat(self):
        if not self.device_token:
            return False
        try:
            response = requests.post(
                f"{server_url}/api/ingest/heartbeat",
                headers={{"Authorization": f"Bearer {{self.device_token}}", "Content-Type": "application/json"}},
                json={{"cpu": 0.0, "mem": 0.0, "activeWindow": "Unknown", "isLocked": False, "timestamp": time.time()}},
                timeout=10
            )
            return response.status_code == 200
        except:
            return False
    
    def run(self, enrollment_token=None):
        if not self.device_token and enrollment_token:
            if not self.enroll_device(enrollment_token):
                return False
        
        if not self.device_token:
            print("No device token available. Please enroll first.")
            return False
        
        print(f"Agent running for device {{self.device_id}}")
        try:
            while True:
                self.send_heartbeat()
                time.sleep(30)
        except KeyboardInterrupt:
            print("Agent stopped by user")
        return True

if __name__ == "__main__":
    import sys
    agent = MonitoringAgent()
    agent.run("{enrollment_token}")
EOF

# Make agent executable
chmod +x "$INSTALL_DIR/crm-agent"

# Create systemd user service for auto-start
mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/crm-agent.service" << EOF
[Unit]
Description=CRM Monitoring Agent
After=network.target

[Service]
ExecStart=$INSTALL_DIR/crm-agent
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF

# Enable and start the service
systemctl --user enable crm-agent.service
systemctl --user start crm-agent.service

echo "Installation completed!"
echo "Agent installed to: $INSTALL_DIR"
echo "Auto-start enabled via systemd"
"""

        response = HttpResponse(script_content, content_type='application/x-sh')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class AdminDeviceConfigView(APIView):
    """Admin endpoint to manage device configuration"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    
    @handle_monitoring_errors
    @log_api_request
    def get(self, request, device_id):
        """Get device configuration"""
        try:
            device = Device.objects.get(id=device_id)
            
            # Get current configuration (stored in device model or separate config)
            config = {
                'screenshot_freq_sec': getattr(device, 'screenshot_freq_sec', 15),
                'heartbeat_freq_sec': getattr(device, 'heartbeat_freq_sec', 20),
                'auto_start': getattr(device, 'auto_start', True),
                'debug_mode': getattr(device, 'debug_mode', False),
                'pause_monitoring': getattr(device, 'pause_monitoring', False),
                'max_screenshot_storage_days': getattr(device, 'max_screenshot_storage_days', 30),
                'keystroke_monitoring': getattr(device, 'keystroke_monitoring', True),
                'mouse_click_monitoring': getattr(device, 'mouse_click_monitoring', True),
                'productivity_tracking': getattr(device, 'productivity_tracking', True),
                'idle_detection': getattr(device, 'idle_detection', True),
                'idle_threshold_minutes': getattr(device, 'idle_threshold_minutes', 30),
            }
            
            return Response(config)
            
        except Device.DoesNotExist:
            return Response(
                {'detail': 'Device not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting device config: {e}")
            return Response(
                {'detail': 'Failed to get device configuration'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @handle_monitoring_errors
    @log_api_request
    def put(self, request, device_id):
        """Update device configuration"""
        try:
            device = Device.objects.get(id=device_id)
            
            # Log configuration change
            log_configuration_change(device_id, request.data, request.user.id if request.user else None)
            
            # Update device configuration fields
            config_fields = [
                'screenshot_freq_sec', 'heartbeat_freq_sec', 'auto_start', 
                'debug_mode', 'pause_monitoring', 'max_screenshot_storage_days',
                'keystroke_monitoring', 'mouse_click_monitoring', 'productivity_tracking',
                'idle_detection', 'idle_threshold_minutes'
            ]
            
            for field in config_fields:
                if field in request.data:
                    setattr(device, field, request.data[field])
            
            device.save()
            
            # Emit WebSocket event for configuration change
            try:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f'device_{device.id}',
                        {
                            'type': 'config_update',
                            'config': request.data
                        }
                    )
            except Exception as e:
                logger.warning(f"WebSocket event emission failed (Redis not available?): {e}")
            
            logger.info(f"Device configuration updated for device {device_id}")
            
            return Response({'detail': 'Configuration updated successfully'})
            
        except Device.DoesNotExist:
            return Response(
                {'detail': 'Device not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error updating device config: {e}")
            return Response(
                {'detail': 'Failed to update device configuration'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Create your views here.
