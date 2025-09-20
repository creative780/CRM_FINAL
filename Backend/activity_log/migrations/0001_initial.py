from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ActivityEvent",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False, editable=False)),
                ("timestamp", models.DateTimeField(db_index=True)),
                (
                    "actor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="activity_events",
                        null=True,
                        blank=True,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("actor_role", models.CharField(max_length=16)),
                ("verb", models.CharField(max_length=32)),
                ("target_type", models.CharField(max_length=64)),
                ("target_id", models.CharField(max_length=128)),
                ("context", models.JSONField(null=True, blank=True)),
                ("source", models.CharField(max_length=16)),
                ("request_id", models.CharField(max_length=128, db_index=True)),
                ("tenant_id", models.CharField(max_length=128, db_index=True)),
                ("hash", models.CharField(max_length=64, db_index=True)),
                ("prev_hash", models.CharField(max_length=64, blank=True, null=True)),
            ],
            options={"db_table": "activity_event"},
        ),
        migrations.CreateModel(
            name="ActivityType",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("key", models.CharField(max_length=64, unique=True)),
                ("description", models.CharField(max_length=255)),
                ("role_scope", models.JSONField(null=True, blank=True)),
                ("default_severity", models.CharField(max_length=32, blank=True, default="info")),
            ],
            options={"db_table": "activity_type"},
        ),
        migrations.CreateModel(
            name="LogIngestionKey",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("key_id", models.CharField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=128)),
                ("secret", models.CharField(max_length=128)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "log_ingestion_key"},
        ),
        migrations.CreateModel(
            name="RetentionPolicy",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=128)),
                ("role_filter", models.JSONField(null=True, blank=True)),
                ("target_type_filter", models.JSONField(null=True, blank=True)),
                ("keep_days", models.IntegerField()),
                ("action", models.CharField(max_length=16)),
                ("drop_fields", models.JSONField(null=True, blank=True)),
                ("mask_fields", models.JSONField(null=True, blank=True)),
                ("enabled", models.BooleanField(default=True)),
            ],
            options={"db_table": "retention_policy"},
        ),
        migrations.CreateModel(
            name="AnonymizationJob",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("status", models.CharField(max_length=16, default="PENDING")),
                ("total_events", models.IntegerField(default=0)),
                ("affected_events", models.IntegerField(default=0)),
                ("log", models.TextField(blank=True, default="")),
                (
                    "policy",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="activity_log.retentionpolicy"),
                ),
            ],
            options={"db_table": "anonymization_job"},
        ),
        migrations.CreateModel(
            name="ExportJob",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("format", models.CharField(max_length=16)),
                ("filters_json", models.JSONField(null=True, blank=True)),
                ("status", models.CharField(max_length=16, default="PENDING")),
                ("file_path", models.CharField(max_length=512, blank=True, default="")),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("error", models.TextField(blank=True, default="")),
                (
                    "requested_by",
                    models.ForeignKey(on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, null=True),
                ),
            ],
            options={"db_table": "export_job"},
        ),
        migrations.AddConstraint(
            model_name="activityevent",
            constraint=models.UniqueConstraint(fields=["tenant_id", "request_id"], name="uniq_event_tenant_reqid"),
        ),
        migrations.AddIndex(
            model_name="activityevent",
            index=models.Index(fields=["tenant_id", "timestamp"], name="idx_event_tenant_ts"),
        ),
    ]

