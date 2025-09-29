"""
WebSocket routing for monitoring application
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/monitoring/$', consumers.MonitoringConsumer.as_asgi()),
    re_path(r'ws/monitoring/device/(?P<device_id>\w+)/$', consumers.DeviceConsumer.as_asgi()),
]

