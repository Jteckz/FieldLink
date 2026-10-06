from django.db import transaction

from apps.moderation.services import log_admin_action
from common.exceptions import DomainError

from .constants import Role
from .models import User


def register_user(*, email, password, role, full_name="", account_type="student"):
    from apps.profiles.models import StudentProfile

    with transaction.atomic():
        user = User.objects.create_user(
            email=email, password=password, role=role, first_name=full_name[:150]
        )
        if role == Role.STUDENT:
            StudentProfile.objects.create(user=user, account_type=account_type, full_name=full_name)
    return user


def suspend_user(user, *, actor, reason=""):
    if user.is_superuser or user.role == Role.ADMIN:
        raise DomainError("Admin accounts cannot be suspended here.", "cannot_suspend_admin")
    user.is_active = False
    user.save(update_fields=["is_active", "updated_at"])
    log_admin_action(actor, "user.suspend", user, reason)
    return user


def reactivate_user(user, *, actor, reason=""):
    user.is_active = True
    user.save(update_fields=["is_active", "updated_at"])
    log_admin_action(actor, "user.reactivate", user, reason)
    return user
