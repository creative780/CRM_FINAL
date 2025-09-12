from django.urls import path
from .views import check_in, check_out, attendance_list, attendance_me

urlpatterns = [
    path('attendance/check-in/', check_in, name='attendance-check-in'),
    path('attendance/check-out/', check_out, name='attendance-check-out'),
    path('attendance/', attendance_list, name='attendance-list'),
    path('attendance/me/', attendance_me, name='attendance-me'),
]
