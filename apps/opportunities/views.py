from django.db.models import Count
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.constants import Role
from apps.organizations.selectors import get_user_organization
from common.exceptions import DomainError
from common.permissions import IsOrganizationUser

from . import selectors, services
from .constants import OpportunityStatus
from .filters import OpportunityFilter
from .serializers import OpportunityDetailSerializer, OpportunityListSerializer, OrganizationOpportunitySerializer


class OpportunityViewSet(viewsets.ReadOnlyModelViewSet):
    """Public discovery of open opportunities."""

    permission_classes = [AllowAny]
    filterset_class = OpportunityFilter
    ordering_fields = ["deadline", "published_at", "title"]
    ordering = ["-published_at"]

    def get_queryset(self):
        return selectors.open_opportunities()

    def get_serializer_class(self):
        return OpportunityListSerializer if self.action == "list" else OpportunityDetailSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        user = self.request.user
        if user.is_authenticated and user.role == Role.STUDENT and hasattr(user, "student_profile"):
            from apps.applications.models import Application, SavedOpportunity

            profile = user.student_profile
            ctx["saved_ids"] = set(SavedOpportunity.objects.filter(student=profile).values_list("opportunity_id", flat=True))
            ctx["applied_ids"] = set(Application.objects.filter(student=profile).values_list("opportunity_id", flat=True))
        return ctx


class OrganizationOpportunityViewSet(viewsets.ModelViewSet):
    """An organization's own opportunities (all statuses)."""

    permission_classes = [IsOrganizationUser]
    serializer_class = OrganizationOpportunitySerializer
    filterset_fields = ["status", "opportunity_type"]
    search_fields = ["title"]
    ordering_fields = ["created_at", "deadline"]

    def _org(self):
        org = get_user_organization(self.request.user)
        if org is None:
            raise DomainError("Create your organization profile first.", "organization_required")
        return org

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return selectors.Opportunity.objects.none()
        return selectors.organization_opportunities(self._org()).annotate(application_count=Count("applications", distinct=True)).order_by("-created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if not getattr(self, "swagger_fake_view", False):
            ctx["organization"] = self._org()
        return ctx

    def perform_destroy(self, instance):
        services.delete_opportunity(instance)

    def _do(self, request, name):
        opportunity = self.get_object()
        services.org_action(opportunity, name, actor=request.user)
        return Response(self.get_serializer(self.get_queryset().get(pk=opportunity.pk)).data)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Submit for moderation (auto-publishes only for trusted orgs when enabled)."""
        return self._do(request, "submit")

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        return self._do(request, "unpublish")

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        return self._do(request, "close")

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        return self._do(request, "archive")
