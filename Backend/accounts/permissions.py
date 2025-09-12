from rest_framework.permissions import BasePermission, SAFE_METHODS


def user_has_any_role(user, roles):
    if getattr(user, 'is_superuser', False):
        return True
    user_roles = getattr(user, 'roles', []) or []
    return any(r in user_roles for r in roles)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return user_has_any_role(request.user, ['admin'])


class RolePermission(BasePermission):
    roles = []

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return user_has_any_role(request.user, getattr(view, 'allowed_roles', self.roles))

