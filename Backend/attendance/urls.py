from django.urls import path
from .views import (
    attendance_employees,
    attendance_list,
    attendance_me,
    attendance_payroll,
    attendance_rules,
    attendance_summary,
    check_in,
    check_out,
)

urlpatterns = [
    path('attendance/check-in/', check_in, name='attendance-check-in'),
    path('attendance/check-out/', check_out, name='attendance-check-out'),
    path('attendance/', attendance_list, name='attendance-list'),
    path('attendance/me/', attendance_me, name='attendance-me'),
    path('attendance/summary/', attendance_summary, name='attendance-summary'),
    path('attendance/rules/', attendance_rules, name='attendance-rules'),
    path('attendance/employees/', attendance_employees, name='attendance-employees'),
    path('attendance/payroll/', attendance_payroll, name='attendance-payroll'),
]
