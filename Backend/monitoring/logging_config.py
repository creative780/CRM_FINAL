"""
Logging configuration for monitoring system
"""

import logging
import logging.handlers
import os
from pathlib import Path
from django.conf import settings

# Create logs directory if it doesn't exist
LOGS_DIR = Path(settings.BASE_DIR) / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

# Monitoring-specific loggers
MONITORING_LOGGERS = {
    'monitoring.heartbeat': {
        'level': 'INFO',
        'handlers': ['heartbeat_file', 'console'],
        'propagate': False,
    },
    'monitoring.screenshot': {
        'level': 'INFO',
        'handlers': ['screenshot_file', 'console'],
        'propagate': False,
    },
    'monitoring.device': {
        'level': 'INFO',
        'handlers': ['device_file', 'console'],
        'propagate': False,
    },
    'monitoring.analytics': {
        'level': 'INFO',
        'handlers': ['analytics_file', 'console'],
        'propagate': False,
    },
    'monitoring.storage': {
        'level': 'INFO',
        'handlers': ['storage_file', 'console'],
        'propagate': False,
    },
    'monitoring.security': {
        'level': 'WARNING',
        'handlers': ['security_file', 'console'],
        'propagate': False,
    },
    'monitoring.performance': {
        'level': 'INFO',
        'handlers': ['performance_file', 'console'],
        'propagate': False,
    },
    'monitoring.cleanup': {
        'level': 'INFO',
        'handlers': ['cleanup_file', 'console'],
        'propagate': False,
    },
    'monitoring.websocket': {
        'level': 'INFO',
        'handlers': ['websocket_file', 'console'],
        'propagate': False,
    },
    'monitoring.api': {
        'level': 'INFO',
        'handlers': ['api_file', 'console'],
        'propagate': False,
    },
}

# Handler configurations
HANDLERS = {
    'heartbeat_file': {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'monitoring_heartbeat.log'),
        'maxBytes': 10 * 1024 * 1024,  # 10MB
        'backupCount': 5,
        'formatter': 'detailed',
    },
    'screenshot_file': {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'monitoring_screenshot.log'),
        'maxBytes': 10 * 1024 * 1024,  # 10MB
        'backupCount': 5,
        'formatter': 'detailed',
    },
    'device_file': {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'monitoring_device.log'),
        'maxBytes': 10 * 1024 * 1024,  # 10MB
        'backupCount': 5,
        'formatter': 'detailed',
    },
    'analytics_file': {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'monitoring_analytics.log'),
        'maxBytes': 10 * 1024 * 1024,  # 10MB
        'backupCount': 5,
        'formatter': 'detailed',
    },
    'storage_file': {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'monitoring_storage.log'),
        'maxBytes': 10 * 1024 * 1024,  # 10MB
        'backupCount': 5,
        'formatter': 'detailed',
    },
    'security_file': {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'monitoring_security.log'),
        'maxBytes': 10 * 1024 * 1024,  # 10MB
        'backupCount': 10,
        'formatter': 'detailed',
    },
    'performance_file': {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'monitoring_performance.log'),
        'maxBytes': 10 * 1024 * 1024,  # 10MB
        'backupCount': 5,
        'formatter': 'detailed',
    },
    'cleanup_file': {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'monitoring_cleanup.log'),
        'maxBytes': 10 * 1024 * 1024,  # 10MB
        'backupCount': 5,
        'formatter': 'detailed',
    },
    'websocket_file': {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'monitoring_websocket.log'),
        'maxBytes': 10 * 1024 * 1024,  # 10MB
        'backupCount': 5,
        'formatter': 'detailed',
    },
    'api_file': {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'monitoring_api.log'),
        'maxBytes': 10 * 1024 * 1024,  # 10MB
        'backupCount': 5,
        'formatter': 'detailed',
    },
    'console': {
        'class': 'logging.StreamHandler',
        'formatter': 'simple',
    },
}

# Formatter configurations
FORMATTERS = {
    'detailed': {
        'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(pathname)s:%(lineno)d',
        'datefmt': '%Y-%m-%d %H:%M:%S',
    },
    'simple': {
        'format': '%(levelname)s - %(name)s - %(message)s',
    },
    'json': {
        'format': '{"timestamp": "%(asctime)s", "logger": "%(name)s", "level": "%(levelname)s", "message": "%(message)s", "module": "%(module)s", "function": "%(funcName)s", "line": %(lineno)d}',
        'datefmt': '%Y-%m-%d %H:%M:%S',
    },
}

def setup_monitoring_logging():
    """Setup monitoring-specific logging configuration"""
    
    # Configure handlers
    for handler_name, handler_config in HANDLERS.items():
        logging.config.dictConfig({
            'version': 1,
            'disable_existing_loggers': False,
            'handlers': {handler_name: handler_config},
            'formatters': FORMATTERS,
        })
    
    # Configure loggers
    for logger_name, logger_config in MONITORING_LOGGERS.items():
        logger = logging.getLogger(logger_name)
        logger.setLevel(getattr(logging, logger_config['level']))
        
        # Clear existing handlers
        logger.handlers.clear()
        
        # Add handlers
        for handler_name in logger_config['handlers']:
            if handler_name in HANDLERS:
                handler = logging.config.dictConfig({
                    'version': 1,
                    'handlers': {handler_name: HANDLERS[handler_name]},
                    'formatters': FORMATTERS,
                })
                logger.addHandler(handler)
        
        logger.propagate = logger_config['propagate']

def get_monitoring_logger(name):
    """Get a monitoring-specific logger"""
    return logging.getLogger(f'monitoring.{name}')

# Convenience functions for different loggers
def get_heartbeat_logger():
    return get_monitoring_logger('heartbeat')

def get_screenshot_logger():
    return get_monitoring_logger('screenshot')

def get_device_logger():
    return get_monitoring_logger('device')

def get_analytics_logger():
    return get_monitoring_logger('analytics')

def get_storage_logger():
    return get_monitoring_logger('storage')

def get_security_logger():
    return get_monitoring_logger('security')

def get_performance_logger():
    return get_monitoring_logger('performance')

def get_cleanup_logger():
    return get_monitoring_logger('cleanup')

def get_websocket_logger():
    return get_monitoring_logger('websocket')

def get_api_logger():
    return get_monitoring_logger('api')

# Logging utilities
def log_heartbeat_event(device_id, event_type, data=None, error=None):
    """Log heartbeat-related events"""
    logger = get_heartbeat_logger()
    if error:
        logger.error(f"Device {device_id} {event_type} error: {error}")
    else:
        logger.info(f"Device {device_id} {event_type}: {data}")

def log_screenshot_event(device_id, event_type, data=None, error=None):
    """Log screenshot-related events"""
    logger = get_screenshot_logger()
    if error:
        logger.error(f"Device {device_id} {event_type} error: {error}")
    else:
        logger.info(f"Device {device_id} {event_type}: {data}")

def log_device_event(device_id, event_type, data=None, error=None):
    """Log device-related events"""
    logger = get_device_logger()
    if error:
        logger.error(f"Device {device_id} {event_type} error: {error}")
    else:
        logger.info(f"Device {device_id} {event_type}: {data}")

def log_analytics_event(event_type, data=None, error=None):
    """Log analytics-related events"""
    logger = get_analytics_logger()
    if error:
        logger.error(f"Analytics {event_type} error: {error}")
    else:
        logger.info(f"Analytics {event_type}: {data}")

def log_storage_event(operation, file_key, success=True, error=None):
    """Log storage-related events"""
    logger = get_storage_logger()
    if success:
        logger.info(f"Storage {operation} successful: {file_key}")
    else:
        logger.error(f"Storage {operation} failed: {file_key} - {error}")

def log_security_event(event_type, details, severity="WARNING"):
    """Log security-related events"""
    logger = get_security_logger()
    if severity == "ERROR":
        logger.error(f"Security event {event_type}: {details}")
    elif severity == "WARNING":
        logger.warning(f"Security event {event_type}: {details}")
    else:
        logger.info(f"Security event {event_type}: {details}")

def log_performance_event(metric_name, value, device_id=None):
    """Log performance-related events"""
    logger = get_performance_logger()
    device_info = f" for device {device_id}" if device_id else ""
    logger.info(f"Performance metric {metric_name}{device_info}: {value}")

def log_cleanup_event(operation_type, items_processed, items_deleted):
    """Log cleanup-related events"""
    logger = get_cleanup_logger()
    logger.info(f"Cleanup {operation_type}: {items_processed} processed, {items_deleted} deleted")

def log_websocket_event(event_type, data=None, error=None):
    """Log WebSocket-related events"""
    logger = get_websocket_logger()
    if error:
        logger.error(f"WebSocket {event_type} error: {error}")
    else:
        logger.info(f"WebSocket {event_type}: {data}")

def log_api_event(event_type, data=None, error=None):
    """Log API-related events"""
    logger = get_api_logger()
    if error:
        logger.error(f"API {event_type} error: {error}")
    else:
        logger.info(f"API {event_type}: {data}")

# Initialize logging when module is imported
try:
    import logging.config
    setup_monitoring_logging()
except Exception as e:
    print(f"Failed to setup monitoring logging: {e}")

