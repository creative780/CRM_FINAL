"""
Error handling utilities for monitoring system
"""

import logging
import traceback
from functools import wraps
from django.http import JsonResponse
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
import json

logger = logging.getLogger(__name__)


class MonitoringError(Exception):
    """Base exception for monitoring system errors"""
    def __init__(self, message, code=None, details=None):
        self.message = message
        self.code = code
        self.details = details
        super().__init__(self.message)


class DeviceNotFoundError(MonitoringError):
    """Raised when a device is not found"""
    def __init__(self, device_id):
        super().__init__(
            f"Device with ID '{device_id}' not found",
            code="DEVICE_NOT_FOUND",
            details={"device_id": device_id}
        )


class AuthenticationError(MonitoringError):
    """Raised when authentication fails"""
    def __init__(self, message="Authentication failed"):
        super().__init__(
            message,
            code="AUTHENTICATION_ERROR"
        )


class StorageError(MonitoringError):
    """Raised when storage operations fail"""
    def __init__(self, message, operation=None):
        super().__init__(
            message,
            code="STORAGE_ERROR",
            details={"operation": operation}
        )


class ValidationError(MonitoringError):
    """Raised when data validation fails"""
    def __init__(self, message, field=None):
        super().__init__(
            message,
            code="VALIDATION_ERROR",
            details={"field": field}
        )


def handle_monitoring_errors(func):
    """Decorator to handle monitoring-specific errors"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except MonitoringError as e:
            logger.error(f"Monitoring error in {func.__name__}: {e.message}")
            return Response(
                {
                    'error': e.message,
                    'code': e.code,
                    'details': e.details
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            logger.error(traceback.format_exc())
            return Response(
                {
                    'error': 'An unexpected error occurred',
                    'code': 'INTERNAL_ERROR'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    return wrapper


def log_api_request(func):
    """Decorator to log API requests and responses"""
    @wraps(func)
    def wrapper(self, request, *args, **kwargs):
        # Log request
        logger.info(f"API Request: {request.method} {request.path}")
        
        # Handle both Django and DRF request objects
        try:
            if hasattr(request, 'data'):
                # DRF Request object
                logger.debug(f"Request data: {request.data}")
            elif hasattr(request, 'body'):
                # Django WSGIRequest object
                body = request.body.decode('utf-8') if request.body else ''
                logger.debug(f"Request body: {body}")
        except Exception as e:
            logger.debug(f"Could not log request data: {e}")
        
        # Log headers safely
        try:
            if hasattr(request, 'headers'):
                logger.debug(f"Request headers: {dict(request.headers)}")
            elif hasattr(request, 'META'):
                # Log only relevant headers from META
                relevant_headers = {k: v for k, v in request.META.items() 
                                  if k.startswith('HTTP_') or k in ['CONTENT_TYPE', 'CONTENT_LENGTH']}
                logger.debug(f"Request headers: {relevant_headers}")
        except Exception as e:
            logger.debug(f"Could not log request headers: {e}")
        
        try:
            response = func(self, request, *args, **kwargs)
            
            # Log response
            if hasattr(response, 'status_code'):
                logger.info(f"API Response: {response.status_code}")
                if response.status_code >= 400:
                    logger.warning(f"Error response: {response.data}")
            
            return response
            
        except Exception as e:
            logger.error(f"API Error in {func.__name__}: {str(e)}")
            logger.error(traceback.format_exc())
            raise
            
    return wrapper


def log_websocket_event(event_type, data=None, error=None):
    """Log WebSocket events"""
    if error:
        logger.error(f"WebSocket {event_type} error: {error}")
    else:
        logger.info(f"WebSocket {event_type}: {data}")


def log_device_activity(device_id, activity_type, details=None):
    """Log device activity"""
    logger.info(f"Device {device_id} {activity_type}: {details}")


def log_storage_operation(operation, file_key, success=True, error=None):
    """Log storage operations"""
    if success:
        logger.info(f"Storage {operation} successful: {file_key}")
    else:
        logger.error(f"Storage {operation} failed: {file_key} - {error}")


def log_heartbeat_received(device_id, data):
    """Log heartbeat reception"""
    logger.debug(f"Heartbeat received from device {device_id}: {data}")


def log_screenshot_received(device_id, file_key, size=None):
    """Log screenshot reception"""
    size_info = f" ({size} bytes)" if size else ""
    logger.info(f"Screenshot received from device {device_id}: {file_key}{size_info}")


def log_enrollment_attempt(device_id, success=True, error=None):
    """Log device enrollment attempts"""
    if success:
        logger.info(f"Device enrollment successful: {device_id}")
    else:
        logger.error(f"Device enrollment failed: {device_id} - {error}")


def log_configuration_change(device_id, changes, user_id=None):
    """Log configuration changes"""
    user_info = f" by user {user_id}" if user_id else ""
    logger.info(f"Device {device_id} configuration changed{user_info}: {changes}")


def log_analytics_query(query_type, filters=None, result_count=None):
    """Log analytics queries"""
    filter_info = f" with filters {filters}" if filters else ""
    count_info = f" ({result_count} results)" if result_count else ""
    logger.info(f"Analytics query: {query_type}{filter_info}{count_info}")


def log_cleanup_operation(operation_type, items_processed, items_deleted):
    """Log cleanup operations"""
    logger.info(f"Cleanup {operation_type}: {items_processed} processed, {items_deleted} deleted")


def log_performance_metric(metric_name, value, device_id=None):
    """Log performance metrics"""
    device_info = f" for device {device_id}" if device_id else ""
    logger.info(f"Performance metric {metric_name}{device_info}: {value}")


def log_security_event(event_type, details, severity="INFO"):
    """Log security-related events"""
    if severity == "ERROR":
        logger.error(f"Security event {event_type}: {details}")
    elif severity == "WARNING":
        logger.warning(f"Security event {event_type}: {details}")
    else:
        logger.info(f"Security event {event_type}: {details}")


def log_system_health(component, status, details=None):
    """Log system health status"""
    if status == "ERROR":
        logger.error(f"System health {component}: {status} - {details}")
    elif status == "WARNING":
        logger.warning(f"System health {component}: {status} - {details}")
    else:
        logger.info(f"System health {component}: {status} - {details}")


def create_error_response(error_message, error_code=None, status_code=400, details=None):
    """Create a standardized error response"""
    response_data = {
        'error': error_message,
        'code': error_code or 'UNKNOWN_ERROR'
    }
    
    if details:
        response_data['details'] = details
    
    return Response(response_data, status=status_code)


def create_success_response(data=None, message=None, status_code=200):
    """Create a standardized success response"""
    response_data = {}
    
    if data is not None:
        response_data['data'] = data
    
    if message:
        response_data['message'] = message
    
    return Response(response_data, status=status_code)


def validate_device_exists(device_id):
    """Validate that a device exists"""
    from .models import Device
    try:
        device = Device.objects.get(id=device_id)
        return device
    except Device.DoesNotExist:
        raise DeviceNotFoundError(device_id)


def validate_required_fields(data, required_fields):
    """Validate that required fields are present"""
    missing_fields = []
    for field in required_fields:
        if field not in data or data[field] is None:
            missing_fields.append(field)
    
    if missing_fields:
        raise ValidationError(
            f"Missing required fields: {', '.join(missing_fields)}",
            field=missing_fields
        )


def validate_field_types(data, field_types):
    """Validate field types"""
    for field, expected_type in field_types.items():
        if field in data and not isinstance(data[field], expected_type):
            raise ValidationError(
                f"Field '{field}' must be of type {expected_type.__name__}",
                field=field
            )


def sanitize_log_data(data):
    """Sanitize sensitive data for logging"""
    if isinstance(data, dict):
        sanitized = {}
        for key, value in data.items():
            if key.lower() in ['password', 'token', 'secret', 'key', 'authorization']:
                sanitized[key] = '***REDACTED***'
            else:
                sanitized[key] = sanitize_log_data(value)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_log_data(item) for item in data]
    else:
        return data


def get_error_context(request, exception):
    """Get context information for error logging"""
    context = {
        'path': request.path,
        'method': request.method,
        'user': getattr(request, 'user', None),
        'device_id': getattr(request, 'device_id', None),
        'ip_address': request.META.get('REMOTE_ADDR'),
        'user_agent': request.META.get('HTTP_USER_AGENT'),
    }
    
    # Add request data (sanitized)
    if hasattr(request, 'data'):
        context['request_data'] = sanitize_log_data(request.data)
    
    return context


def log_error_with_context(exception, request=None, context=None):
    """Log error with full context"""
    error_context = context or {}
    
    if request:
        error_context.update(get_error_context(request, exception))
    
    logger.error(
        f"Error: {str(exception)}",
        extra={
            'exception_type': type(exception).__name__,
            'traceback': traceback.format_exc(),
            'context': error_context
        }
    )
