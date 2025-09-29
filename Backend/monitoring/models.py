from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


def generate_device_id():
    return f"dev_{uuid.uuid4().hex[:12]}"


def generate_org_id():
    return f"org_{uuid.uuid4().hex[:12]}"


def generate_session_id():
    return f"sess_{uuid.uuid4().hex[:12]}"


def generate_screenshot_id():
    return f"scr_{uuid.uuid4().hex[:12]}"


def generate_token_id():
    return f"tok_{uuid.uuid4().hex[:12]}"


def generate_heartbeat_id():
    return f"hb_{uuid.uuid4().hex[:12]}"


# Legacy models for backward compatibility
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


# Main monitoring models
class Org(models.Model):
    id = models.CharField(default=generate_org_id, max_length=25, primary_key=True, serialize=False)
    name = models.CharField(max_length=255, unique=True)
    retention_days = models.IntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Device(models.Model):
    STATUS_CHOICES = [
        ('ONLINE', 'Online'),
        ('OFFLINE', 'Offline'),
        ('IDLE', 'Idle'),
        ('PAUSED', 'Paused'),
    ]

    id = models.CharField(default=generate_device_id, max_length=25, primary_key=True, serialize=False)
    hostname = models.CharField(max_length=255)
    os = models.CharField(max_length=100)
    agent_version = models.CharField(max_length=50, blank=True, default='')
    ip = models.GenericIPAddressField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OFFLINE')
    org = models.ForeignKey(Org, on_delete=models.CASCADE, null=True, blank=True, related_name='devices')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    current_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='devices')
    current_user_name = models.CharField(max_length=255, blank=True)
    current_user_role = models.CharField(max_length=32, null=True, blank=True)
    last_user_bind_at = models.DateTimeField(null=True, blank=True)
    
    # Configuration fields
    screenshot_freq_sec = models.IntegerField(default=15)
    heartbeat_freq_sec = models.IntegerField(default=20)
    auto_start = models.BooleanField(default=True)
    debug_mode = models.BooleanField(default=False)
    pause_monitoring = models.BooleanField(default=False)
    max_screenshot_storage_days = models.IntegerField(default=30)
    keystroke_monitoring = models.BooleanField(default=True)
    mouse_click_monitoring = models.BooleanField(default=True)
    productivity_tracking = models.BooleanField(default=True)
    idle_detection = models.BooleanField(default=True)
    idle_threshold_minutes = models.IntegerField(default=30)
    avg_productivity_score = models.FloatField(default=0.0)
    last_heartbeat = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_heartbeat']

    def __str__(self):
        return f"{self.hostname} ({self.id})"


class DeviceToken(models.Model):
    id = models.CharField(default=generate_token_id, max_length=25, primary_key=True, serialize=False)
    device = models.OneToOneField(Device, on_delete=models.CASCADE, related_name='token')
    secret = models.CharField(max_length=255, unique=True)
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_expired(self):
        """Check if the token is expired"""
        from django.utils import timezone
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Token for {self.device.hostname}"


class Heartbeat(models.Model):
    id = models.CharField(default=generate_heartbeat_id, max_length=25, primary_key=True, serialize=False)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='heartbeats')
    cpu_percent = models.FloatField()
    mem_percent = models.FloatField()
    active_window = models.CharField(max_length=255, blank=True)
    is_locked = models.BooleanField(default=False)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_id_snapshot = models.IntegerField(null=True, blank=True)
    user_name_snapshot = models.CharField(max_length=255, blank=True)
    user_role_snapshot = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Phase 2: Enhanced monitoring fields
    keystroke_count = models.IntegerField(default=0)
    mouse_click_count = models.IntegerField(default=0)
    productivity_score = models.FloatField(default=0.0)
    keystroke_rate_per_minute = models.FloatField(default=0.0)
    click_rate_per_minute = models.FloatField(default=0.0)
    active_time_minutes = models.FloatField(default=0.0)
    session_duration_minutes = models.FloatField(default=0.0)
    top_applications = models.JSONField(default=dict, blank=True)
    idle_alert = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Heartbeat for {self.device.hostname} at {self.created_at}"


class Screenshot(models.Model):
    id = models.CharField(default=generate_screenshot_id, max_length=25, primary_key=True, serialize=False)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='screenshots')
    blob_key = models.CharField(max_length=500)
    thumb_key = models.CharField(max_length=500)
    width = models.IntegerField()
    height = models.IntegerField()
    sha256 = models.CharField(max_length=64, unique=True)
    user_id_snapshot = models.IntegerField(null=True, blank=True)
    user_name_snapshot = models.CharField(max_length=255, blank=True)
    user_role_snapshot = models.CharField(max_length=50, blank=True)
    taken_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-taken_at']

    def __str__(self):
        return f"Screenshot for {self.device.hostname} at {self.taken_at}"


class Session(models.Model):
    id = models.CharField(default=generate_session_id, max_length=25, primary_key=True, serialize=False)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='sessions')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(choices=[('ALLOWED', 'Allowed'), ('PRECONDITION_FAILED', 'Precondition Failed'), ('BLOCKED', 'Blocked')], default='PRECONDITION_FAILED', max_length=20)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"Session {self.id} for {self.device.hostname}"


class DeviceUserBind(models.Model):
    id = models.CharField(default=generate_session_id, max_length=25, primary_key=True, serialize=False)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='user_binds')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='device_binds')
    user_name = models.CharField(max_length=255)
    user_role = models.CharField(max_length=32)
    bound_at = models.DateTimeField(auto_now_add=True)
    unbound_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-bound_at']
        indexes = [
            models.Index(fields=['device', 'is_active']),
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        return f"Device {self.device.hostname} bound to {self.user.email}"


class IdleAlert(models.Model):
    id = models.CharField(default=generate_session_id, max_length=25, primary_key=True, serialize=False)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='idle_alerts')
    idle_duration_minutes = models.IntegerField()
    alert_sent_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    is_resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ['-alert_sent_at']
        indexes = [
            models.Index(fields=['device', 'alert_sent_at']),
            models.Index(fields=['is_resolved']),
        ]

    def __str__(self):
        return f"Idle alert for {self.device.hostname} at {self.alert_sent_at}"
