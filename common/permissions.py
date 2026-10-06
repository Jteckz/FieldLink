from rest_framework.permissions import BasePermission

from apps.accounts.constants import Role


class _RolePermission(BasePermission):
    role = None

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == self.role)


class IsStudent(_RolePermission):
    role = Role.STUDENT


class IsOrganizationUser(_RolePermission):
    role = Role.ORGANIZATION


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and (user.role == Role.ADMIN or user.is_superuser)
        )
