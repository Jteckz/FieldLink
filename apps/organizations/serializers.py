from rest_framework import serializers

from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    """Owner's view of their own organization."""

    industry_name = serializers.CharField(source="industry.name", read_only=True, default=None)
    location_name = serializers.CharField(source="location.__str__", read_only=True, default=None)

    class Meta:
        model = Organization
        fields = [
            "id", "name", "description", "industry", "industry_name", "location", "location_name",
            "address", "website", "contact_email", "contact_phone", "registration_number",
            "verification_status", "verification_notes", "verified_at", "created_at",
        ]
        read_only_fields = ["id", "verification_status", "verification_notes", "verified_at", "created_at"]


class PublicOrganizationSerializer(serializers.ModelSerializer):
    industry_name = serializers.CharField(source="industry.name", read_only=True, default=None)
    location_name = serializers.CharField(source="location.__str__", read_only=True, default=None)
    is_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = Organization
        fields = ["id", "name", "description", "industry_name", "location_name", "website", "is_verified"]


class OrganizationBriefSerializer(serializers.ModelSerializer):
    is_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = Organization
        fields = ["id", "name", "is_verified"]
