from __future__ import annotations

from typing import Any

from datetime import timezone as dt_timezone
from rest_framework import serializers

from .models import ActivityEvent, ExportJob, ExportFormat


class ActorField(serializers.Serializer):
    id = serializers.CharField(allow_blank=True, required=False)
    role = serializers.CharField()


class TargetField(serializers.Serializer):
    type = serializers.CharField()
    id = serializers.CharField()


class ContextField(serializers.DictField):
    child = serializers.JSONField(required=False)


class ActivityEventIngestSerializer(serializers.Serializer):
    timestamp = serializers.DateTimeField(default_timezone=dt_timezone.utc)
    tenant_id = serializers.CharField()
    actor = ActorField(required=False, allow_null=True)
    verb = serializers.CharField()
    target = TargetField()
    source = serializers.CharField()
    request_id = serializers.CharField(required=False, allow_blank=True)
    context = ContextField(required=False)


class ActivityEventSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()
    target = serializers.SerializerMethodField()

    class Meta:
        model = ActivityEvent
        fields = (
            "id",
            "timestamp",
            "actor",
            "verb",
            "target",
            "context",
            "source",
            "hash",
        )

    def get_actor(self, obj: ActivityEvent) -> dict[str, Any]:
        name = None
        if obj.actor_id and getattr(obj, "actor", None):
            # prefer username; fall back to first/last
            username = getattr(obj.actor, "username", None)
            full = " ".join(filter(None, [getattr(obj.actor, "first_name", None), getattr(obj.actor, "last_name", None)])).strip()
            name = username or (full if full else None)
        if not name and not obj.actor_id:
            name = "System"
        return {
            "id": str(obj.actor_id) if obj.actor_id else None,
            "role": obj.actor_role,
            "name": name,
        }

    def get_target(self, obj: ActivityEvent) -> dict[str, Any]:
        return {
            "type": obj.target_type,
            "id": obj.target_id,
        }

    def to_representation(self, instance: ActivityEvent):
        data = super().to_representation(instance)
        include_pii = self.context.get("include_pii", False)
        if not include_pii:
            # mask common PII fields in context
            ctx = dict(data.get("context") or {})
            for fld in ("ip", "user_agent", "filename"):
                if fld in ctx:
                    ctx[fld] = "***"
            data["context"] = ctx
        return data


class ExportJobRequestSerializer(serializers.Serializer):
    format = serializers.ChoiceField(choices=[ExportFormat.CSV, ExportFormat.NDJSON])
    filters = serializers.DictField(required=False, default=dict)
    fields = serializers.ListField(child=serializers.CharField(), required=False)


class ExportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportJob
        fields = (
            "id",
            "format",
            "status",
            "file_path",
            "started_at",
            "finished_at",
            "error",
        )
