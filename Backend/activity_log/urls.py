from django.urls import path

from .views import (
    IngestView,
    ActivityEventListView,
    ActivityEventDetailView,
    ExportStartView,
    ExportStatusView,
    ExportDownloadView,
    MetricsView,
    TypesView,
    PoliciesView,
    PoliciesRunView,
)


urlpatterns = [
    path("activity-logs/ingest", IngestView.as_view(), name="activity_ingest"),
    path("activity-logs/", ActivityEventListView.as_view(), name="activity_list"),
    path("activity-logs/<uuid:id>", ActivityEventDetailView.as_view(), name="activity_detail"),
    path("activity-logs/export", ExportStartView.as_view(), name="activity_export_start"),
    path("activity-logs/exports/<int:id>", ExportStatusView.as_view(), name="activity_export_status"),
    path("activity-logs/exports/<int:job_id>/download", ExportDownloadView.as_view(), name="activity_export_download"),
    path("activity-logs/metrics", MetricsView.as_view(), name="activity_metrics"),
    path("activity-logs/types", TypesView.as_view(), name="activity_types"),
    path("activity-logs/policies/retention", PoliciesView.as_view(), name="activity_policies"),
    path("activity-logs/policies/run", PoliciesRunView.as_view(), name="activity_policies_run"),
]
