from __future__ import annotations

from typing import Iterable

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False
        roles = getattr(user, "roles", []) or []
        return "admin" in roles or getattr(user, "is_superuser", False)


def user_role(user) -> str:
    roles = (getattr(user, "roles", []) or [])
    if getattr(user, "is_superuser", False):
        return "ADMIN"
    # prefer an order of precedence
    mapping = [
        ("admin", "ADMIN"),
        ("sales", "SALES"),
        ("designer", "DESIGNER"),
        ("production", "PRODUCTION"),
    ]
    for k, v in mapping:
        if k in roles:
            return v
    return ""


def allowed_target_types_for_role(role: str) -> Iterable[str]:
    role = role.upper()
    if role == "ADMIN":
        return ["*"]
    if role == "SALES":
        return ["Client", "Lead", "Quotation", "Order", "Payment"]
    if role == "DESIGNER":
        return ["Design", "File", "Revision", "Comment", "Order"]
    if role == "PRODUCTION":
        return ["Job", "Machine", "QA", "InventoryItem", "Dispatch", "Order"]
    return []
