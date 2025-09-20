from __future__ import annotations

from django.utils import timezone
from rest_framework.response import Response

from ..models import ActivityEvent, Source
from ..permissions import user_role
from .hashing import compute_event_hash


class ActivityLoggingMixin:
    activity_target_type: str = ""
    activity_id_attr: str = "id"
    activity_verb_create: str = "CREATE"
    activity_verb_update: str = "UPDATE"
    activity_verb_delete: str = "DELETE"

    def _log(self, verb: str, target_id: str, context: dict | None = None):
        try:
            payload = {
                "timestamp": timezone.now(),
                "tenant_id": getattr(self.request, "tenant_id", "default"),
                "actor": {"id": getattr(self.request.user, "id", None), "role": user_role(self.request.user)},
                "verb": verb,
                "target": {"type": self.activity_target_type or self.__class__.__name__, "id": str(target_id)},
                "source": Source.API,
                "request_id": getattr(self.request, "request_id", ""),
                "context": context or {},
            }
            canon = {
                "timestamp": payload["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ"),
                "tenant_id": payload["tenant_id"],
                "actor": payload["actor"],
                "verb": payload["verb"],
                "target": payload["target"],
                "source": payload["source"],
                "request_id": payload["request_id"],
                "context": payload["context"],
            }
            ev_hash = compute_event_hash(canon)
            ActivityEvent.objects.create(
                timestamp=payload["timestamp"],
                actor_id=payload["actor"]["id"],
                actor_role=payload["actor"]["role"],
                verb=payload["verb"],
                target_type=payload["target"]["type"],
                target_id=payload["target"]["id"],
                context=payload["context"],
                source=payload["source"],
                request_id=payload["request_id"],
                tenant_id=payload["tenant_id"],
                hash=ev_hash,
            )
        except Exception:
            pass
