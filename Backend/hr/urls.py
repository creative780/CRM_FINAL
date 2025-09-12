from django.urls import path
from .views import HREmployeesListView, SalarySlipCreateView

urlpatterns = [
    path('hr/employees', HREmployeesListView.as_view(), name='hr-employees'),
    path('hr/salary-slips', SalarySlipCreateView.as_view(), name='hr-salary-slips'),
]
