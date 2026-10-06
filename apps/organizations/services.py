from django.db import transaction
from django.utils import timezone

from apps.moderation.services import log_admin_action
from common.exceptions import Conflict, DomainError

from .models import Organization, OrganizationMember, VerificationStatus


def create_organization(*, owner, **data):
    if owner.organization_memberships.exists():
        raise Conflict("You already have an organization profile.", "organization_exists")
    with transaction.atomic():
        org = Organization.objects.create(**data)
        OrganizationMember.objects.create(organization=org, user=owner, role=OrganizationMember.MemberRole.OWNER)
    return org


def submit_for_verification(org):
    if org.verification_status in (VerificationStatus.PENDING, VerificationStatus.VERIFIED):
        raise DomainError(f"Organization is already {org.verification_status}.", "invalid_verification_state")
    missing = [f for f in ("description", "contact_email") if not getattr(org, f)]
    if missing:
        raise DomainError("Complete your organization profile first.", "profile_incomplete", {"missing_fields": missing})
    org.verification_status = VerificationStatus.PENDING
    org.save(update_fields=["verification_status", "updated_at"])
    return org


def approve_verification(org, *, actor, note=""):
    if org.verification_status != VerificationStatus.PENDING:
        raise DomainError("Only organizations pending review can be approved.", "invalid_verification_state")
    org.verification_status = VerificationStatus.VERIFIED
    org.verified_at, org.verified_by = timezone.now(), actor
    org.verification_notes = note
    org.save(update_fields=["verification_status", "verified_at", "verified_by", "verification_notes", "updated_at"])
    log_admin_action(actor, "organization.verify", org, note)
    return org


def reject_verification(org, *, actor, note):
    if org.verification_status != VerificationStatus.PENDING:
        raise DomainError("Only organizations pending review can be rejected.", "invalid_verification_state")
    if not note:
        raise DomainError("A reason is required when rejecting.", "note_required")
    org.verification_status = VerificationStatus.REJECTED
    org.verification_notes = note
    org.save(update_fields=["verification_status", "verification_notes", "updated_at"])
    log_admin_action(actor, "organization.reject", org, note)
    return org


def set_organization_active(org, *, active, actor, note=""):
    org.is_active = active
    org.save(update_fields=["is_active", "updated_at"])
    log_admin_action(actor, "organization.reactivate" if active else "organization.suspend", org, note)
    return org
