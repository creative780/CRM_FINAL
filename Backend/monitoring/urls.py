from django.urls import path
from .views import (
    EmployeesListView, TrackView, ScreenshotUploadView, ScreenshotDeleteView,
    EnrollRequestView, EnrollCompleteView, HeartbeatView, ScreenshotIngestView,
    AdminDevicesListView, AdminDeviceDetailView, AdminDeviceConfigView,
    AdminScreenshotsView, AdminEmployeeActivityView, AgentContextView, AgentDownloadView
)
from .analytics_views import (
    AnalyticsOverviewView, DeviceAnalyticsView, ProductivityAnalyticsView, UsagePatternsView
)
from .file_views import MonitoringFileView

urlpatterns = [
    # Legacy endpoints for backward compatibility
    path('employees', EmployeesListView.as_view(), name='employees-list'),
    path('track', TrackView.as_view(), name='employees-track'),
    path('screenshot', ScreenshotUploadView.as_view(), name='screenshot-upload'),
    path('screenshot/delete', ScreenshotDeleteView.as_view(), name='screenshot-delete'),
    
    # New monitoring system endpoints
    path('enroll/request', EnrollRequestView.as_view(), name='enroll-request'),
    path('enroll/complete', EnrollCompleteView.as_view(), name='enroll-complete'),
    path('ingest/heartbeat', HeartbeatView.as_view(), name='heartbeat'),
    path('ingest/screenshot', ScreenshotIngestView.as_view(), name='screenshot-ingest'),
    path('agent/context', AgentContextView.as_view(), name='agent-context'),
    path('agent/download', AgentDownloadView.as_view(), name='agent-download'),
    
    # Admin endpoints
    path('admin/devices', AdminDevicesListView.as_view(), name='admin-devices-list'),
    path('admin/devices/<str:device_id>', AdminDeviceDetailView.as_view(), name='admin-device-detail'),
    path('admin/devices/<str:device_id>/config', AdminDeviceConfigView.as_view(), name='admin-device-config'),
    path('admin/screenshots', AdminScreenshotsView.as_view(), name='admin-screenshots'),
    path('admin/employee-activity', AdminEmployeeActivityView.as_view(), name='admin-employee-activity'),
    
    # Analytics endpoints
    path('admin/analytics/overview', AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('admin/analytics/device/<str:device_id>', DeviceAnalyticsView.as_view(), name='device-analytics'),
    path('admin/analytics/productivity', ProductivityAnalyticsView.as_view(), name='productivity-analytics'),
    path('admin/analytics/usage-patterns', UsagePatternsView.as_view(), name='usage-patterns'),

    # File serving
    path('files/<path:file_path>', MonitoringFileView.as_view(), name='monitoring-files'),
]
