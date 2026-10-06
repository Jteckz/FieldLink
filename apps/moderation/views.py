from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts import services as account_services
from apps.accounts.models import User
from apps.opportunities import services as opportunity_services
from apps.opportunities.models import Opportunity
from apps.organizations import services as org_services
from apps.organizations.models import Organization
from common.permissions import IsPlatformAdmin

from .models import AdminActionLog
from .serializers import (
    AdminActionLogSerializer, AdminOpportunitySerializer, AdminOrganizationSerializer,
    AdminUserSerializer, NoteSerializer,
)


class _AdminViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsPlatformAdmin]

    def _note(self, request):
        s = NoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return s.validated_data["note"]

    def _respond(self, obj):
        return Response(self.get_serializer(self.get_queryset().get(pk=obj.pk)).data)


class AdminUserViewSet(_AdminViewSet):
    queryset = User.objects.order_by("-date_joined")
    serializer_class = AdminUserSerializer
    filterset_fields = ["role", "is_active"]
    search_fields = ["email"]

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        user = account_services.suspend_user(self.get_object(), actor=request.user, reason=self._note(request))
        return self._respond(user)

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        user = account_services.reactivate_user(self.get_object(), actor=request.user, reason=self._note(request))
        return self._respond(user)


class AdminOrganizationViewSet(_AdminViewSet):
    queryset = Organization.objects.order_by("-created_at")
    serializer_class = AdminOrganizationSerializer
    filterset_fields = ["verification_status", "is_active"]
    search_fields = ["name", "registration_number"]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        org = org_services.approve_verification(self.get_object(), actor=request.user, note=self._note(request))
        return self._respond(org)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        org = org_services.reject_verification(self.get_object(), actor=request.user, note=self._note(request))
        return self._respond(org)

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        org = org_services.set_organization_active(self.get_object(), active=False, actor=request.user, note=self._note(request))
        return self._respond(org)

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        org = org_services.set_organization_active(self.get_object(), active=True, actor=request.user, note=self._note(request))
        return self._respond(org)


class AdminOpportunityViewSet(_AdminViewSet):
    queryset = Opportunity.objects.select_related("organization", "opportunity_type").order_by("-created_at")
    serializer_class = AdminOpportunitySerializer
    filterset_fields = ["status", "organization"]
    search_fields = ["title", "organization__name"]

    def _act(self, request, name):
        opp = opportunity_services.admin_action(self.get_object(), name, actor=request.user, note=self._note(request))
        return self._respond(opp)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._act(request, "approve")

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._act(request, "reject")

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        return self._act(request, "suspend")


class AdminActionLogViewSet(_AdminViewSet):
    queryset = AdminActionLog.objects.select_related("actor")
    serializer_class = AdminActionLogSerializer
    filterset_fields = ["action", "target_type", "target_id"]
