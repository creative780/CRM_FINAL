from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from monitoring.models import Employee
from .models import SalarySlip
from .serializers import HREmployeeSerializer, SalarySlipSerializer
from accounts.permissions import RolePermission


class HREmployeesListView(APIView):
	permission_classes = [RolePermission]
	allowed_roles = ['admin', 'finance']
	def get(self, request):
		employees = Employee.objects.all().order_by('name')
		return Response(HREmployeeSerializer(employees, many=True).data)


class SalarySlipCreateView(APIView):
	permission_classes = [RolePermission]
	allowed_roles = ['admin']
	def post(self, request):
		s = SalarySlipSerializer(data=request.data)
		s.is_valid(raise_exception=True)
		obj = s.save()
		return Response(SalarySlipSerializer(obj).data, status=status.HTTP_201_CREATED)

# Create your views here.
