from django.contrib import admin
from .models import (
    ActivityEvent,
    ActivityType,
    LogIngestionKey,
    RetentionPolicy,
    AnonymizationJob,
    ExportJob,
)


@admin.register(ActivityEvent)
class ActivityEventAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "actor", "actor_role", "verb", "target_type", "target_id", "tenant_id")
    list_filter = ("actor_role", "verb", "target_type", "source", "tenant_id")
    search_fields = ("hash", "request_id", "target_id")
    readonly_fields = (
        "id",
        "timestamp",
        "actor",
        "actor_role",
        "verb",
        "target_type",
        "target_id",
        "context",
        "source",
        "request_id",
        "tenant_id",
        "hash",
        "prev_hash",
    )


@admin.register(ActivityType)
class ActivityTypeAdmin(admin.ModelAdmin):
    list_display = ("key", "description", "default_severity")
    search_fields = ("key", "description")


@admin.register(LogIngestionKey)
class LogIngestionKeyAdmin(admin.ModelAdmin):
    list_display = ("key_id", "name", "is_active", "created_at")
    search_fields = ("key_id", "name")


@admin.register(RetentionPolicy)
class RetentionPolicyAdmin(admin.ModelAdmin):
    list_display = ("name", "keep_days", "action", "enabled")
    list_filter = ("action", "enabled")


@admin.register(AnonymizationJob)
class AnonymizationJobAdmin(admin.ModelAdmin):
    list_display = ("id", "policy", "status", "started_at", "finished_at", "affected_events")
    list_filter = ("status",)


@admin.register(ExportJob)
class ExportJobAdmin(admin.ModelAdmin):
    list_display = ("id", "format", "status", "requested_by", "started_at", "finished_at")
    list_filter = ("format", "status")

