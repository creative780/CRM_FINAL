from datetime import datetime, time, timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class AttendanceRule(models.Model):
    """Singleton model storing organisation-wide attendance rules."""

    work_start = models.TimeField(default=time(9, 0))
    work_end = models.TimeField(default=time(17, 30))
    grace_minutes = models.PositiveIntegerField(default=5)
    standard_work_minutes = models.PositiveIntegerField(default=510)  # 8h30m
    overtime_after_minutes = models.PositiveIntegerField(default=510)
    late_penalty_per_minute = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    per_day_deduction = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    overtime_rate_per_minute = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    weekend_days = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Attendance rule'
        verbose_name_plural = 'Attendance rules'

    def save(self, *args, **kwargs):
        if not self.weekend_days:
            self.weekend_days = [5, 6]
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        instance = cls.objects.first()
        if instance:
            return instance
        instance = cls.objects.create()
        return instance


class Attendance(models.Model):
    STATUS_PRESENT = 'present'
    STATUS_LATE = 'late'
    STATUS_ABSENT = 'absent'
    STATUS_CHOICES = (
        (STATUS_PRESENT, 'Present'),
        (STATUS_LATE, 'Late'),
        (STATUS_ABSENT, 'Absent'),
    )

    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='attendance_records')
    check_in = models.DateTimeField()
    check_out = models.DateTimeField(null=True, blank=True)
    date = models.DateField()
    total_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PRESENT)
    location_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_address = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_id = models.CharField(max_length=255, blank=True)
    device_info = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['employee', 'date']
        ordering = ['-date', '-check_in']

    def __str__(self):
        return f"{self.employee.username} - {self.date}"

    def save(self, *args, **kwargs):
        if self.check_in and not self.date:
            self.date = timezone.localdate(self.check_in)

        if self.check_in and self.check_out:
            duration = self.check_out - self.check_in
            hours = duration.total_seconds() / 3600
            self.total_hours = round(hours, 2)
        super().save(*args, **kwargs)

    @property
    def duration_display(self) -> str:
        if not self.check_out:
            return 'In Progress'
        duration = self.check_out - self.check_in
        total_minutes = int(duration.total_seconds() // 60)
        hours, minutes = divmod(total_minutes, 60)
        return f"{hours}h {minutes}m"

    @classmethod
    def determine_status(cls, check_in_dt: datetime) -> str:
        rules = AttendanceRule.get_solo()
        tz = timezone.get_current_timezone()
        local_dt = timezone.localtime(check_in_dt)
        start_dt = timezone.make_aware(datetime.combine(local_dt.date(), rules.work_start), tz)
        grace_delta = timedelta(minutes=rules.grace_minutes)
        if local_dt > start_dt + grace_delta:
            return cls.STATUS_LATE
        return cls.STATUS_PRESENT
