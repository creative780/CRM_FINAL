from django.urls import path
from .views import dashboard_kpis, dashboard_recent_activity

urlpatterns = [
    path('dashboard/kpis/', dashboard_kpis, name='dashboard-kpis'),
    path('dashboard/recent-activity/', dashboard_recent_activity, name='dashboard-recent-activity'),
]
