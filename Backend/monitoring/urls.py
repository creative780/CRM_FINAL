from django.urls import path
from .views import EmployeesListView, TrackView, ScreenshotUploadView, ScreenshotDeleteView

urlpatterns = [
    path('employees', EmployeesListView.as_view(), name='employees-list'),
    path('track', TrackView.as_view(), name='employees-track'),
    path('screenshot', ScreenshotUploadView.as_view(), name='screenshot-upload'),
    path('screenshot/delete', ScreenshotDeleteView.as_view(), name='screenshot-delete'),
]
