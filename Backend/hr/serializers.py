from rest_framework import serializers
from monitoring.models import Employee
from .models import SalarySlip


class HREmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'name', 'salary', 'designation', 'email', 'phone', 'image']


class SalarySlipSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalarySlip
        fields = ['id', 'employee', 'period', 'gross', 'net', 'meta', 'created_at']

