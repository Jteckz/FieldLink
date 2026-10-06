from rest_framework import status, viewsets
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsOrganizationUser

from . import services
from .models import Organization, VerificationStatus
from .selectors import get_user_organization
from .serializers import OrganizationSerializer, PublicOrganizationSerializer


class OrganizationMeView(APIView):
    permission_classes = [IsOrganizationUser]

    def _org(self, request):
        org = get_user_organization(request.user)
        if org is None:
            raise NotFound("You have not created an organization profile yet.")
        return org

    def get(self, request):
        return Response(OrganizationSerializer(self._org(request)).data)

    def post(self, request):
        serializer = OrganizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org = services.create_organization(owner=request.user, **serializer.validated_data)
        return Response(OrganizationSerializer(org).data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        org = self._org(request)
        serializer = OrganizationSerializer(org, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    put = patch


class SubmitVerificationView(APIView):
    permission_classes = [IsOrganizationUser]

    def post(self, request):
        org = get_user_organization(request.user)
        if org is None:
            raise NotFound("You have not created an organization profile yet.")
        services.submit_for_verification(org)
        return Response(OrganizationSerializer(org).data)


class PublicOrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    """Public directory of *verified*, active organizations."""

    permission_classes = [AllowAny]
    serializer_class = PublicOrganizationSerializer
    lookup_value_regex = r"\d+"
    search_fields = ["name", "description"]
    filterset_fields = ["industry", "location"]

    def get_queryset(self):
        return Organization.objects.filter(
            is_active=True, verification_status=VerificationStatus.VERIFIED
        ).select_related("industry", "location")
