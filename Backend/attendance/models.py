from django.db import models
from django.conf import settings


class Attendance(models.Model):
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='attendance_records')
    check_in = models.DateTimeField()
    check_out = models.DateTimeField(null=True, blank=True)
    date = models.DateField()
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['employee', 'date']
        ordering = ['-date', '-check_in']

    def __str__(self):
        return f"{self.employee.username} - {self.date}"

    def save(self, *args, **kwargs):
        if self.check_in and self.check_out:
            duration = self.check_out - self.check_in
            self.total_hours = duration.total_seconds() / 3600
        super().save(*args, **kwargs)
