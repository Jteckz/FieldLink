from django.conf import settings
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.opportunities.constants import OpportunityStatus
from apps.opportunities.models import Opportunity
from apps.organizations.selectors import is_org_member
from apps.profiles.models import AccountType
from apps.profiles.services import get_current_cv, get_owned_cv
from common.constants import STUDY_LEVEL_ORDER
from common.exceptions import Conflict, DomainError

from .constants import ORGANIZATION_ALLOWED, STUDENT_ALLOWED, TRANSITIONS, ApplicationStatus
from .models import Application, ApplicationEvent, SavedOpportunity


# ------------------------------------------------------------------ eligibility
def eligibility_issues(student, requirement):
    """Explicit, auditable eligibility rules (NOT a matching score)."""
    issues = []
    if requirement is None:
        return issues
    if student.account_type == AccountType.STUDENT and not requirement.students_eligible:
        issues.append("This opportunity is open to graduates only.")
    if student.account_type == AccountType.GRADUATE and not requirement.graduates_eligible:
        issues.append("This opportunity is open to current students only.")
    if requirement.min_study_level and student.study_level:
        if STUDY_LEVEL_ORDER[student.study_level] < STUDY_LEVEL_ORDER[requirement.min_study_level]:
            issues.append(f"A minimum study level of '{requirement.min_study_level}' is required.")
    if (
        requirement.min_year_of_study
        and student.account_type == AccountType.STUDENT
        and (student.year_of_study or 0) < requirement.min_year_of_study
    ):
        issues.append(f"You must be at least in year {requirement.min_year_of_study} of study.")
    return issues


# ------------------------------------------------------------------- applying
def apply_to_opportunity(*, student, opportunity_id, cover_letter="", cv_id=None):
    opportunity = (
        Opportunity.objects.select_related("organization", "requirements")
        .filter(pk=opportunity_id, organization__is_active=True)
        .first()
    )
    if opportunity is None:
        raise DomainError("Opportunity not found.", "opportunity_not_found")
    if opportunity.status != OpportunityStatus.PUBLISHED:
        raise DomainError("This opportunity is not open for applications.", "opportunity_not_open")
    if opportunity.deadline_passed:
        raise DomainError("The application deadline has passed.", "deadline_passed")
    if not student.is_complete:
        raise DomainError("Complete your profile before applying.", "profile_incomplete", {"missing_fields": student.missing_fields()})

    issues = eligibility_issues(student, getattr(opportunity, "requirements", None))
    if issues:
        raise DomainError("You are not eligible for this opportunity.", "not_eligible", {"reasons": issues})

    cv = get_owned_cv(student, cv_id) if cv_id else get_current_cv(student)
    if cv is None and settings.APPLICATION_REQUIRES_CV:
        raise DomainError("Upload a CV before applying.", "cv_required")

    if Application.objects.filter(student=student, opportunity=opportunity).exists():
        raise Conflict("You have already applied to this opportunity.", "already_applied")
    try:
        with transaction.atomic():
            application = Application.objects.create(
                student=student, opportunity=opportunity, cover_letter=cover_letter, cv=cv
            )
            ApplicationEvent.objects.create(
                application=application, new_status=ApplicationStatus.SUBMITTED, actor=student.user
            )
    except IntegrityError:  # race: concurrent double-submit hit the DB constraint
        raise Conflict("You have already applied to this opportunity.", "already_applied")
    return application


# --------------------------------------------------------------- status changes
def change_application_status(*, application_id, new_status, actor, note=""):
    with transaction.atomic():
        application = get_object_or_404(
            Application.objects.select_for_update().select_related("student", "opportunity__organization"),
            pk=application_id,
        )
        if application.student.user_id == actor.id:
            allowed = STUDENT_ALLOWED
        elif is_org_member(actor, application.opportunity.organization):
            allowed = ORGANIZATION_ALLOWED
        else:
            raise PermissionDenied("You cannot change this application.")

        current = ApplicationStatus(application.status)
        target = ApplicationStatus(new_status)
        if target not in allowed or target not in TRANSITIONS[current]:
            raise DomainError(
                f"Cannot move application from '{current.value}' to '{target.value}'.", "invalid_transition"
            )
        application.status = target
        application.status_updated_at = timezone.now()
        application.save(update_fields=["status", "status_updated_at"])
        ApplicationEvent.objects.create(
            application=application, old_status=current, new_status=target, actor=actor, note=note
        )
    return application


# ----------------------------------------------------------------------- saved
def save_opportunity(*, student, opportunity_id):
    opportunity = get_object_or_404(Opportunity, pk=opportunity_id, status=OpportunityStatus.PUBLISHED)
    obj, _ = SavedOpportunity.objects.get_or_create(student=student, opportunity=opportunity)
    return obj


def unsave_opportunity(*, student, opportunity_id):
    SavedOpportunity.objects.filter(student=student, opportunity_id=opportunity_id).delete()
