from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import AnonymousUser
from .auth_utils import authenticate_device_token


class DeviceTokenAuthentication(BaseAuthentication):
    """
    Custom authentication class for device tokens
    """
    
    def authenticate(self, request):
        """
        Authenticate using device token
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        try:
            device = authenticate_device_token(request)
            # Return a tuple of (user, auth) where user is the device's current_user
            # and auth is the device object
            user = device.current_user if hasattr(device, 'current_user') else None
            return (user, device)
        except AuthenticationFailed:
            return None
    
    def authenticate_header(self, request):
        """
        Return a string to be used as the value of the `WWW-Authenticate`
        header in a `401 Unauthenticated` response.
        """
        return 'Bearer'
