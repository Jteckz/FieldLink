from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.organizations.selectors import get_user_organization
from common.exceptions import DomainError
from common.permissions import IsOrganizationUser, IsStudent

from . import selectors, services
from .constants import ApplicationStatus
from .serializers import (
    ApplyInputSerializer, OrgApplicationDetailSerializer, OrgApplicationListSerializer,
    SavedOpportunitySerializer, StatusInputSerializer,
    StudentApplicationDetailSerializer, StudentApplicationListSerializer,
)


class ApplyView(APIView):
    permission_classes = [IsStudent]
    throttle_scope = "apply"

    def post(self, request, pk):
        data = ApplyInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        application = services.apply_to_opportunity(
            student=request.user.student_profile,
            opportunity_id=pk,
            cover_letter=data.validated_data["cover_letter"],
            cv_id=data.validated_data.get("cv"),
        )
        application = selectors.student_applications(request.user.student_profile).get(pk=application.pk)
        return Response(StudentApplicationDetailSerializer(application, context={"request": request}).data, status=status.HTTP_201_CREATED)


class SaveView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, pk):
        services.save_opportunity(student=request.user.student_profile, opportunity_id=pk)
        return Response({"saved": True}, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        services.unsave_opportunity(student=request.user.student_profile, opportunity_id=pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SavedOpportunityListView(ListAPIView):
    permission_classes = [IsStudent]
    serializer_class = SavedOpportunitySerializer

    def get_queryset(self):
        return self.request.user.student_profile.saved_opportunities.select_related(
            "opportunity__organization", "opportunity__opportunity_type", "opportunity__location"
        )


class StudentApplicationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsStudent]
    filterset_fields = ["status"]
    ordering_fields = ["submitted_at", "status_updated_at"]

    def get_queryset(self):
        return selectors.student_applications(self.request.user.student_profile)

    def get_serializer_class(self):
        return StudentApplicationListSerializer if self.action == "list" else StudentApplicationDetailSerializer

    @action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        application = self.get_object()  # object scoped to this student's queryset
        services.change_application_status(
            application_id=application.pk, new_status=ApplicationStatus.WITHDRAWN, actor=request.user
        )
        return Response(self.get_serializer(self.get_queryset().get(pk=application.pk)).data)


class OrganizationApplicationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsOrganizationUser]
    filterset_fields = ["status", "opportunity"]
    search_fields = ["student__full_name"]
    ordering_fields = ["submitted_at", "status_updated_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return selectors.Application.objects.none()
        org = get_user_organization(self.request.user)
        if org is None:
            raise DomainError("Create your organization profile first.", "organization_required")
        return selectors.organization_applications(org)

    def get_serializer_class(self):
        return OrgApplicationListSerializer if self.action == "list" else OrgApplicationDetailSerializer

    @action(detail=True, methods=["post"], url_path="status")
    def change_status(self, request, pk=None):
        application = self.get_object()  # 404 for applications of other organizations
        data = StatusInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.change_application_status(
            application_id=application.pk,
            new_status=data.validated_data["status"],
            actor=request.user,
            note=data.validated_data["note"],
        )
        return Response(OrgApplicationDetailSerializer(self.get_queryset().get(pk=application.pk), context={"request": request}).data)
