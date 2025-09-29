from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any, Optional

from django.conf import settings
# from django.contrib.postgres.fields import ArrayField  # Commented out for SQLite compatibility
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import JSONField, Index


class ActorRole(models.TextChoices):
    ADMIN = "ADMIN"
    SALES = "SALES"
    DESIGNER = "DESIGNER"
    PRODUCTION = "PRODUCTION"
    SYSTEM = "SYSTEM"


class Verb(models.TextChoices):
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    ASSIGN = "ASSIGN"
    STATUS_CHANGE = "STATUS_CHANGE"
    COMMENT = "COMMENT"
    UPLOAD = "UPLOAD"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    CHECKIN = "CHECKIN"
    CHECKOUT = "CHECKOUT"
    SCREENSHOT = "SCREENSHOT"
    OTHER = "OTHER"


class Source(models.TextChoices):
    API = "API"
    ADMIN_UI = "ADMIN_UI"
    FRONTEND = "FRONTEND"
    WORKER = "WORKER"
    WEBHOOK = "WEBHOOK"


class ActivityEvent(models.Model):
    """
    Append-only, immutable audit-quality event.
    Monthly partitioning is applied via SQL migrations if DB supports it (PostgreSQL).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(db_index=True)

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="activity_events"
    )
    actor_role = models.CharField(max_length=16, choices=ActorRole.choices)

    verb = models.CharField(max_length=32, choices=Verb.choices)

    target_type = models.CharField(max_length=64)
    target_id = models.CharField(max_length=128)

    context = JSONField(default=dict)

    source = models.CharField(max_length=16, choices=Source.choices)

    request_id = models.CharField(max_length=128, db_index=True)
    tenant_id = models.CharField(max_length=128, db_index=True)

    hash = models.CharField(max_length=64, db_index=True, validators=[RegexValidator(r"^[0-9a-f]{64}$")])
    prev_hash = models.CharField(max_length=64, blank=True, null=True)

    class Meta:
        db_table = "activity_event"
        indexes = [
            Index(fields=["tenant_id", "timestamp"], name="idx_event_tenant_ts"),
        ]
        constraints = [
            models.UniqueConstraint(fields=["tenant_id", "request_id"], name="uniq_event_tenant_reqid"),
        ]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"{self.timestamp} {self.verb} {self.target_type}:{self.target_id}"


class ActivityType(models.Model):
    key = models.CharField(max_length=64, unique=True)
    description = models.CharField(max_length=255)
    role_scope = models.JSONField(blank=True, default=list)
    default_severity = models.CharField(max_length=32, blank=True, default="info")

    class Meta:
        db_table = "activity_type"


class LogIngestionKey(models.Model):
    key_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    secret = models.CharField(max_length=128)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "log_ingestion_key"


class RetentionAction(models.TextChoices):
    PURGE = "purge"
    ANONYMIZE = "anonymize"


class RetentionPolicy(models.Model):
    name = models.CharField(max_length=128)
    role_filter = models.JSONField(blank=True, default=list)
    target_type_filter = models.JSONField(blank=True, default=list)
    keep_days = models.IntegerField()
    action = models.CharField(max_length=16, choices=RetentionAction.choices)
    drop_fields = models.JSONField(blank=True, default=list)
    mask_fields = JSONField(default=dict, blank=True)
    enabled = models.BooleanField(default=True)

    class Meta:
        db_table = "retention_policy"


class JobStatus(models.TextChoices):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AnonymizationJob(models.Model):
    policy = models.ForeignKey(RetentionPolicy, on_delete=models.CASCADE)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=JobStatus.choices, default=JobStatus.PENDING)
    total_events = models.IntegerField(default=0)
    affected_events = models.IntegerField(default=0)
    log = models.TextField(blank=True, default="")

    class Meta:
        db_table = "anonymization_job"


class ExportFormat(models.TextChoices):
    CSV = "CSV"
    NDJSON = "NDJSON"


class ExportJob(models.Model):
    format = models.CharField(max_length=16, choices=ExportFormat.choices)
    filters_json = JSONField(default=dict)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=16, choices=JobStatus.choices, default=JobStatus.PENDING)
    file_path = models.CharField(max_length=512, blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True, default="")

    class Meta:
        db_table = "export_job"


@dataclass
class CanonicalEvent:
    timestamp: str
    tenant_id: str
    actor: dict[str, Any]
    verb: str
    target: dict[str, Any]
    source: str
    request_id: str
    context: dict[str, Any]

