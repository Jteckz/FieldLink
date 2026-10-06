from django.utils import timezone

from .constants import OpportunityStatus
from .models import Opportunity


def _base():
    return Opportunity.objects.select_related(
        "organization", "opportunity_type", "location", "requirements"
    ).prefetch_related("requirements__courses", "requirements__skills")


def open_opportunities():
    """Publicly discoverable: published, not past deadline, organization active."""
    return _base().filter(
        status=OpportunityStatus.PUBLISHED,
        deadline__gte=timezone.localdate(),
        organization__is_active=True,
        organization__members__user__is_active=True,
    ).distinct()


def organization_opportunities(org):
    return _base().filter(organization=org)
