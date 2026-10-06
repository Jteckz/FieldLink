from django.db.models import Count

from apps.accounts.models import User
from apps.applications.models import Application
from apps.opportunities.models import Opportunity
from apps.organizations.models import Organization


def _counts(qs, field):
    return {row[field]: row["n"] for row in qs.values(field).annotate(n=Count("id"))}


def platform_stats():
    return {
        "users": {"total": User.objects.count(), "by_role": _counts(User.objects.all(), "role"),
                  "suspended": User.objects.filter(is_active=False).count()},
        "organizations": {"total": Organization.objects.count(),
                          "by_verification_status": _counts(Organization.objects.all(), "verification_status")},
        "opportunities": {"total": Opportunity.objects.count(),
                          "by_status": _counts(Opportunity.objects.all(), "status")},
        "applications": {"total": Application.objects.count(),
                         "by_status": _counts(Application.objects.all(), "status")},
    }
