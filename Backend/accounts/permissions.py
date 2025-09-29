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
        # If the view specifies allowed_roles, always check roles regardless of method
        allowed_roles = getattr(view, 'allowed_roles', self.roles)
        if allowed_roles:
            return user_has_any_role(request.user, allowed_roles)
        
        # Fallback to authentication check for SAFE methods when no roles specified
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return user_has_any_role(request.user, self.roles)

