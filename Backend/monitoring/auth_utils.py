import jwt
import secrets
import hashlib
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.http import HttpRequest
from monitoring.models import Device, DeviceToken, DeviceUserBind
from rest_framework.exceptions import AuthenticationFailed
import logging

logger = logging.getLogger(__name__)


def generate_device_token() -> str:
    """Generate a secure device token"""
    return secrets.token_urlsafe(32)


def create_enrollment_token(user_id: str, org_id: str = None, expires_minutes: int = 15) -> str:
    """Create a short-lived enrollment token"""
    payload = {
        'user_id': user_id,
        'org_id': org_id,
        'exp': timezone.now() + timedelta(minutes=expires_minutes),
        'type': 'enrollment'
    }
    
    secret = getattr(settings, 'JWT_SECRET', settings.SECRET_KEY)
    return jwt.encode(payload, secret, algorithm='HS256')


def verify_enrollment_token(token: str) -> dict:
    """Verify and decode enrollment token"""
    try:
        secret = getattr(settings, 'JWT_SECRET', settings.SECRET_KEY)
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        
        if payload.get('type') != 'enrollment':
            raise AuthenticationFailed('Invalid token type')
        
        if timezone.now().timestamp() > payload['exp']:
            raise AuthenticationFailed('Token expired')
        
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed('Token expired')
    except jwt.InvalidTokenError:
        raise AuthenticationFailed('Invalid token')


def create_device_token(device: Device, expires_days: int = 14) -> DeviceToken:
    """Create a long-lived device token"""
    secret = generate_device_token()
    token_value = generate_device_token()  # Generate a separate token value
    expires_at = timezone.now() + timedelta(days=expires_days)
    
    # Invalidate any existing tokens for this device
    DeviceToken.objects.filter(device=device).delete()
    
    token = DeviceToken.objects.create(
        device=device,
        secret=secret,
        token=token_value,  # Add this line - this was missing!
        expires_at=expires_at
    )
    
    logger.info(f"Created device token for device {device.id}")
    return token


def authenticate_device_token(request: HttpRequest) -> Device:
    """Authenticate request using device token"""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    
    if not auth_header.startswith('Bearer '):
        raise AuthenticationFailed('Missing or invalid authorization header')
    
    token = auth_header.split(' ')[1]
    
    try:
        device_token = DeviceToken.objects.get(secret=token)
    except DeviceToken.DoesNotExist:
        raise AuthenticationFailed('Invalid device token')
    
    if device_token.is_expired():
        device_token.delete()
        raise AuthenticationFailed('Device token expired')
    
    return device_token.device


def get_device_from_request(request: HttpRequest) -> Device:
    """Get device from request headers or cookies"""
    # Try to get device ID from header
    device_id = request.META.get('HTTP_X_DEVICE_ID')
    
    if device_id:
        try:
            return Device.objects.get(id=device_id)
        except Device.DoesNotExist:
            pass
    
    # Try to get device ID from cookies
    device_id = request.COOKIES.get('device_id')
    
    if device_id:
        try:
            return Device.objects.get(id=device_id)
        except Device.DoesNotExist:
            pass
    
    return None


def check_device_heartbeat_requirement(user, max_age_minutes: int = 2) -> tuple[bool, Device]:
    """Check if user has a recent device heartbeat"""
    devices = Device.objects.filter(user=user)
    
    if not devices.exists():
        return False, None
    
    cutoff_time = timezone.now() - timedelta(minutes=max_age_minutes)
    
    for device in devices:
        if device.last_heartbeat and device.last_heartbeat >= cutoff_time:
            return True, device
    
    return False, devices.first()


def sign_payload(payload: bytes, secret: str) -> str:
    """Create HMAC signature for payload"""
    return hashlib.sha256(payload + secret.encode()).hexdigest()


def verify_payload_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify HMAC signature for payload"""
    expected_signature = sign_payload(payload, secret)
    return secrets.compare_digest(signature, expected_signature)


def bind_device_to_user(device_id: str, user):
    """Bind a device to a user and create binding history"""
    try:
        device = Device.objects.get(id=device_id)
        
        # Update device binding
        device.current_user = user
        device.current_user_name = user.get_full_name() or user.username
        # Get user's primary role from roles list
        user_roles = getattr(user, 'roles', [])
        primary_role = user_roles[0] if user_roles else 'sales'  # Default to sales instead of user
        device.current_user_role = primary_role
        device.last_user_bind_at = timezone.now()
        device.save(update_fields=['current_user', 'current_user_name', 'current_user_role', 'last_user_bind_at'])
        
        # Create binding history
        DeviceUserBind.objects.create(
            device=device,
            user=user,
            user_name=device.current_user_name,
            user_role=device.current_user_role,
        )
        
        logger.info(f"Device {device_id} bound to user {user.username}")
        return True
        
    except Device.DoesNotExist:
        logger.error(f"Device {device_id} not found for binding")
        return False
    except Exception as e:
        logger.error(f"Failed to bind device {device_id} to user {user.username}: {e}")
        return False


def check_device_heartbeat_by_id(device_id: str, max_age_minutes: int = 2) -> tuple[bool, Device]:
    """Check if a specific device has a recent heartbeat"""
    try:
        device = Device.objects.get(id=device_id)
        cutoff_time = timezone.now() - timedelta(minutes=max_age_minutes)
        
        if device.last_heartbeat and device.last_heartbeat >= cutoff_time:
            return True, device
        else:
            return False, device
            
    except Device.DoesNotExist:
        logger.warning(f"Device {device_id} not found")
        return False, None