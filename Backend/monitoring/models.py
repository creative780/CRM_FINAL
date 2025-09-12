from django.db import models


class Employee(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('idle', 'Idle'),
        ('offline', 'Offline'),
    )

    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    department = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='offline')
    last_screenshot_at = models.DateTimeField(null=True, blank=True)
    productivity = models.FloatField(default=0.0)

    # HR-related fields used by salary-slip form
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    designation = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    image = models.CharField(max_length=500, blank=True)  # store URL/path

    def __str__(self):
        return self.name


class EmployeeActivity(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='activities')
    when = models.DateTimeField()
    action = models.CharField(max_length=120, blank=True)
    application = models.CharField(max_length=120, blank=True)
    delta_k = models.IntegerField(default=0)
    delta_c = models.IntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['employee', 'when']),
        ]


class EmployeeAsset(models.Model):
    KIND_CHOICES = (
        ('screenshot', 'Screenshot'),
        ('video', 'Video'),
    )
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='assets')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    path = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)


class EmployeeSummary(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='summaries')
    date = models.DateField()
    keystrokes = models.IntegerField(default=0)
    clicks = models.IntegerField(default=0)
    active_minutes = models.IntegerField(default=0)
    idle_minutes = models.IntegerField(default=0)
    productivity = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('employee', 'date')

# Create your models here.
