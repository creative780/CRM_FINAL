from django.urls import path
from .views import activity_logs_list

urlpatterns = [
    path('activity-logs/', activity_logs_list, name='activity-logs-list'),
]
