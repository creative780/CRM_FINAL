from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)

def _log_login_event(request, user):
    try:
        from activity_log.models import ActivityEvent, Source
        from activity_log.permissions import user_role
        from activity_log.utils.hashing import compute_event_hash
        from app.common.net_utils import get_client_ip, resolve_client_hostname

        role = user_role(user) or "SYSTEM"
        # Prefer explicit fields from JSON body, then headers, then DNS fallback
        body_device_id = None
        body_device_name = None
        body_ip = None
        try:
            data = request.data if hasattr(request, 'data') else {}
            body_device_id = (data.get('device_id') or data.get('deviceId'))
            body_device_name = (data.get('device_name') or data.get('deviceName'))
            body_ip = (data.get('ip') or data.get('ip_address'))
        except Exception:
            pass

        ip_address = (body_ip or get_client_ip(request) or request.META.get("REMOTE_ADDR") or "").strip() or None
        device_id = (
            body_device_id
            or request.headers.get("X-Device-Id")
            or request.META.get("HTTP_X_DEVICE_ID")
        )
        device_name_hdr = (
            body_device_name
            or request.headers.get("X-Device-Name")
            or request.META.get("HTTP_X_DEVICE_NAME")
        )
        device_name = (device_name_hdr or resolve_client_hostname(ip_address))
        device_info = request.META.get("HTTP_USER_AGENT")
        ctx = {
            "ip": ip_address,  # legacy key used by logs page
            "user_agent": device_info,  # legacy key
            "ip_address": ip_address,
            "device_id": device_id,
            "device_name": device_name,
            "device_info": device_info,
            "severity": "info",
            "tags": ["auth"],
        }
        # canonical payload for hashing
        canon = {
            "timestamp": timezone.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "tenant_id": "default",
            "actor": {"id": str(user.id), "role": role},
            "verb": "LOGIN",
            "target": {"type": "User", "id": str(user.id)},
            "source": "FRONTEND",
            "request_id": f"req_{uuid4().hex}",
            "context": ctx,
        }
        ev_hash = compute_event_hash(canon)
        ActivityEvent.objects.create(
            timestamp=timezone.now(),
            actor_id=user.id,
            actor_role=role,
            verb="LOGIN",
            target_type="User",
            target_id=str(user.id),
            context=ctx,
            source=Source.FRONTEND,
            request_id=canon["request_id"],
            tenant_id="default",
            hash=ev_hash,
        )
    except Exception:
        # do not break auth on logging errors, but log details for troubleshooting
        logger.exception("Failed to log LOGIN activity event")

def _log_logout_event(request, user):
    try:
        from activity_log.models import ActivityEvent, Source
        from activity_log.permissions import user_role
        from activity_log.utils.hashing import compute_event_hash
        from app.common.net_utils import get_client_ip, resolve_client_hostname

        role = user_role(user) or "SYSTEM"
        body_device_id = None
        body_device_name = None
        body_ip = None
        try:
            data = request.data if hasattr(request, 'data') else {}
            body_device_id = (data.get('device_id') or data.get('deviceId'))
            body_device_name = (data.get('device_name') or data.get('deviceName'))
            body_ip = (data.get('ip') or data.get('ip_address'))
        except Exception:
            pass
        ip_address = (body_ip or get_client_ip(request) or request.META.get("REMOTE_ADDR") or "").strip() or None
        device_id = (
            body_device_id
            or request.headers.get("X-Device-Id")
            or request.META.get("HTTP_X_DEVICE_ID")
        )
        device_name_hdr = (
            body_device_name
            or request.headers.get("X-Device-Name")
            or request.META.get("HTTP_X_DEVICE_NAME")
        )
        device_name = (device_name_hdr or resolve_client_hostname(ip_address))
        device_info = request.META.get("HTTP_USER_AGENT")
        ctx = {
            "ip": ip_address,
            "user_agent": device_info,
            "ip_address": ip_address,
            "device_id": device_id,
            "device_name": device_name,
            "device_info": device_info,
            "severity": "info",
            "tags": ["auth"],
        }
        canon = {
            "timestamp": timezone.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "tenant_id": "default",
            "actor": {"id": str(user.id), "role": role},
            "verb": "LOGOUT",
            "target": {"type": "User", "id": str(user.id)},
            "source": "FRONTEND",
            "request_id": f"req_{uuid4().hex}",
            "context": ctx,
        }
        ev_hash = compute_event_hash(canon)
        ActivityEvent.objects.create(
            timestamp=timezone.now(),
            actor_id=user.id,
            actor_role=role,
            verb="LOGOUT",
            target_type="User",
            target_id=str(user.id),
            context=ctx,
            source=Source.FRONTEND,
            request_id=canon["request_id"],
            tenant_id="default",
            hash=ev_hash,
        )
    except Exception:
        logger.exception("Failed to log LOGOUT activity event")
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .models import User
from .permissions import IsAdmin
from drf_spectacular.utils import extend_schema


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=LoginSerializer, responses={200: UserSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Check device heartbeat requirement for non-admin users
        if not user.is_admin():
            # Get device ID from request headers
            device_id = request.META.get('HTTP_X_DEVICE_ID')
            
            if not device_id:
                # No device ID provided - block login and provide enrollment token
                try:
                    from monitoring.models import Session
                    from monitoring.auth_utils import create_enrollment_token
                    
                    # Create enrollment token for this user
                    enrollment_token = create_enrollment_token(
                        user_id=str(user.id),
                        org_id=user.org_id
                    )
                    
                    # Try to create session, handle missing fields gracefully
                    try:
                        Session.objects.create(
                            user=user,
                            device=None,
                            status='PRECONDITION_FAILED'
                        )
                    except Exception as e:
                        logger.warning(f"Failed to create session: {e}")
                    
                    return Response(
                        {
                            'error': 'Device ID required. Please install and run the monitoring agent.',
                            'enrollment_token': enrollment_token
                        },
                        status=status.HTTP_412_PRECONDITION_FAILED
                    )
                except Exception as e:
                    logger.error(f"Failed to handle missing device ID: {e}")
                    return Response(
                        {
                            'error': 'Device ID required. Please install and run the monitoring agent.',
                            'enrollment_token': None
                        },
                        status=status.HTTP_412_PRECONDITION_FAILED
                    )
            
            # Check if device has recent heartbeat
            try:
                from monitoring.auth_utils import check_device_heartbeat_by_id
                has_recent_heartbeat, device = check_device_heartbeat_by_id(device_id, max_age_minutes=2)
                
                if not has_recent_heartbeat:
                    # No recent heartbeat - block login and provide enrollment token
                    try:
                        from monitoring.models import Session
                        from monitoring.auth_utils import create_enrollment_token
                        
                        # Create enrollment token for this user
                        enrollment_token = create_enrollment_token(
                            user_id=str(user.id),
                            org_id=user.org_id
                        )
                        
                        # Try to create session, handle missing fields gracefully
                        try:
                            Session.objects.create(
                                user=user,
                                device=device,
                                status='PRECONDITION_FAILED'
                            )
                        except Exception as e:
                            logger.warning(f"Failed to create session: {e}")
                        
                        return Response(
                            {
                                'error': 'Agent not running or not responding. Please ensure the monitoring agent is running.',
                                'enrollment_token': enrollment_token
                            },
                            status=status.HTTP_412_PRECONDITION_FAILED
                        )
                    except Exception as e:
                        logger.error(f"Failed to handle missing heartbeat: {e}")
                        return Response(
                            {
                                'error': 'Agent not running or not responding. Please ensure the monitoring agent is running.',
                                'enrollment_token': None
                            },
                            status=status.HTTP_412_PRECONDITION_FAILED
                        )
                
                # Device has recent heartbeat - bind device to user and allow login
                try:
                    from monitoring.auth_utils import bind_device_to_user
                    bind_device_to_user(device_id, user)
                    
                    # Log session as allowed
                    try:
                        from monitoring.models import Session
                        Session.objects.create(
                            user=user,
                            device=device,
                            status='ALLOWED'
                        )
                    except Exception as e:
                        logger.warning(f"Failed to create session: {e}")
                except Exception as e:
                    logger.warning(f"Failed to bind device to user: {e}")
            except Exception as e:
                logger.error(f"Failed to check device heartbeat: {e}")
                # If we can't check heartbeat, allow login but log the issue
                pass
        
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        refresh = RefreshToken.for_user(user)
        
        # log login event (best effort)
        _log_login_event(request, user)
        return Response({
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'role': request.data.get('role'),
            'username': user.username,
        })


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # best-effort log; token not blacklisted here
        _log_logout_event(request, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class RegisterView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(request=RegisterSerializer, responses={201: UserSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        return Response(UserSerializer(request.user).data)

# Create your views here.
