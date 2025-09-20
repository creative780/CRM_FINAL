from __future__ import annotations

from typing import Any, Callable, Dict
from functools import wraps
from django.utils import timezone

from ..models import ActivityEvent, Source
from ..permissions import user_role
from .hashing import compute_event_hash


def log_activity(verb: str, target_getter: Callable[[Any, tuple, dict], Dict[str, Any]], context_getter: Callable[[Any, tuple, dict], Dict[str, Any]] | None = None):
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            result = func(self, *args, **kwargs)
            try:
                target = target_getter(self, args, kwargs)
                context = context_getter(self, args, kwargs) if context_getter else {}
                payload = {
                    "timestamp": timezone.now(),
                    "tenant_id": getattr(self.request, "tenant_id", "default"),
                    "actor": {"id": getattr(self.request.user, "id", None), "role": user_role(getattr(self, "request", None).user) if getattr(self, "request", None) else "SYSTEM"},
                    "verb": verb,
                    "target": target,
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
            return result
        return wrapper
    return decorator
