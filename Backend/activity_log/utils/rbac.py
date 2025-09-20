from __future__ import annotations

from typing import Iterable
from django.db.models import Q, QuerySet

from ..models import ActivityEvent
from ..permissions import allowed_target_types_for_role, user_role


def apply_rbac(queryset: QuerySet[ActivityEvent], user) -> QuerySet[ActivityEvent]:
    role = user_role(user)
    if role == "ADMIN":
        return queryset
    if not role:
        # No role assigned: allow user to see their own events
        return queryset.filter(Q(actor_id=user.id))

    allowed_types: Iterable[str] = allowed_target_types_for_role(role)
    # allow actor's own events
    q = Q(actor_id=user.id)
    if "*" in allowed_types:
        return queryset
    if allowed_types:
        q |= Q(target_type__in=list(allowed_types))
    return queryset.filter(q)
