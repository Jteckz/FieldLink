from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.moderation.services import log_admin_action
from common.exceptions import DomainError

from .constants import ADMIN_ACTIONS, ORG_ACTIONS, OpportunityStatus
from .models import Opportunity, OpportunityRequirement


def _apply_requirements(opportunity, data):
    req, _ = OpportunityRequirement.objects.get_or_create(opportunity=opportunity)
    data = dict(data)
    courses, skills = data.pop("courses", None), data.pop("skills", None)
    for field, value in data.items():
        setattr(req, field, value)
    req.save()
    if courses is not None:
        req.courses.set(courses)
    if skills is not None:
        req.skills.set(skills)
    return req


def create_opportunity(*, organization, requirements=None, **data):
    with transaction.atomic():
        opportunity = Opportunity.objects.create(organization=organization, **data)
        _apply_requirements(opportunity, requirements or {})
    return opportunity


def update_opportunity(opportunity, *, requirements=None, **data):
    if opportunity.status != OpportunityStatus.DRAFT:
        raise DomainError(
            "Only draft opportunities can be edited. Unpublish it first.", "not_editable"
        )
    with transaction.atomic():
        for field, value in data.items():
            setattr(opportunity, field, value)
        opportunity.save()
        if requirements is not None:
            _apply_requirements(opportunity, requirements)
    return opportunity


def delete_opportunity(opportunity):
    if opportunity.status != OpportunityStatus.DRAFT:
        raise DomainError("Only draft opportunities can be deleted.", "not_deletable")
    if opportunity.applications.exists():
        raise DomainError("Opportunities with applications cannot be deleted.", "has_applications")
    opportunity.delete()


def _transition(opportunity, rules, action, *, actor=None, note=""):
    allowed_from, target = rules[action]
    if opportunity.status not in allowed_from:
        raise DomainError(
            f"Cannot {action} an opportunity that is '{opportunity.status}'.", "invalid_transition"
        )
    opportunity.status = target
    return target


def org_action(opportunity, action, *, actor):
    """Organization-side lifecycle actions: submit / unpublish / close / archive."""
    if action == "submit":
        if opportunity.deadline_passed:
            raise DomainError("The deadline has already passed.", "deadline_passed")
        if not opportunity.is_remote and opportunity.location_id is None:
            raise DomainError("A location is required unless the opportunity is remote.", "location_required")
    target = _transition(opportunity, ORG_ACTIONS, action)
    fields = ["status", "updated_at"]

    if action == "submit" and settings.AUTO_PUBLISH_VERIFIED_ORGS and opportunity.organization.is_verified:
        opportunity.status = OpportunityStatus.PUBLISHED
        opportunity.published_at = timezone.now()
        fields.append("published_at")
    opportunity.save(update_fields=fields)
    return opportunity


def admin_action(opportunity, action, *, actor, note=""):
    """Moderation: approve (publish) / reject / suspend. Always audited."""
    if action in ("reject", "suspend") and not note:
        raise DomainError("A note is required for this action.", "note_required")
    if action == "approve" and opportunity.deadline_passed:
        raise DomainError("Cannot publish: the deadline has passed.", "deadline_passed")
    _transition(opportunity, ADMIN_ACTIONS, action)
    opportunity.reviewed_by, opportunity.reviewed_at = actor, timezone.now()
    opportunity.moderation_note = note
    fields = ["status", "reviewed_by", "reviewed_at", "moderation_note", "updated_at"]
    if action == "approve":
        opportunity.published_at = timezone.now()
        fields.append("published_at")
    opportunity.save(update_fields=fields)
    log_admin_action(actor, f"opportunity.{action}", opportunity, note)
    return opportunity


def expire_due_opportunities():
    """Mark published opportunities past their deadline as EXPIRED. Run daily."""
    return Opportunity.objects.filter(
        status=OpportunityStatus.PUBLISHED, deadline__lt=timezone.localdate()
    ).update(status=OpportunityStatus.EXPIRED, updated_at=timezone.now())
