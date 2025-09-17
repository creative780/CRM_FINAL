from rest_framework import serializers
from .models import Attendance, AttendanceRule


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    duration_display = serializers.CharField(read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id',
            'employee',
            'employee_name',
            'check_in',
            'check_out',
            'date',
            'total_hours',
            'notes',
            'status',
            'location_lat',
            'location_lng',
            'location_address',
            'ip_address',
            'device_id',
            'device_info',
            'duration_display',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['total_hours', 'duration_display', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username


class CheckInSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)
    location_lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    location_lng = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    location_address = serializers.CharField(required=False, allow_blank=True)
    ip_address = serializers.CharField(required=False, allow_blank=True)
    device_id = serializers.CharField(required=False, allow_blank=True)
    device_info = serializers.CharField(required=False, allow_blank=True)


class CheckOutSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)
    location_lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    location_lng = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    location_address = serializers.CharField(required=False, allow_blank=True)
    ip_address = serializers.CharField(required=False, allow_blank=True)
    device_id = serializers.CharField(required=False, allow_blank=True)
    device_info = serializers.CharField(required=False, allow_blank=True)


class AttendanceRuleSerializer(serializers.ModelSerializer):
    def validate_weekend_days(self, value):
        if value is None:
            return []
        cleaned = []
        for day in value:
            try:
                day_int = int(day)
            except (TypeError, ValueError):
                raise serializers.ValidationError('Weekend days must be integers between 0 and 6.')
            if day_int < 0 or day_int > 6:
                raise serializers.ValidationError('Weekend days must be integers between 0 and 6.')
            cleaned.append(day_int)
        return cleaned

    class Meta:
        model = AttendanceRule
        fields = [
            'work_start',
            'work_end',
            'grace_minutes',
            'standard_work_minutes',
            'overtime_after_minutes',
            'late_penalty_per_minute',
            'per_day_deduction',
            'overtime_rate_per_minute',
            'weekend_days',
            'updated_at',
        ]
        read_only_fields = ['updated_at']
