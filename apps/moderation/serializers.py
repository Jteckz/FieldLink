from rest_framework import serializers

from apps.accounts.models import User
from apps.opportunities.models import Opportunity
from apps.organizations.models import Organization

from .models import AdminActionLog


class NoteSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default="", max_length=2000)


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "role", "is_active", "date_joined", "last_login"]


class AdminOrganizationSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ["id", "name", "description", "registration_number", "contact_email", "contact_phone",
                  "website", "verification_status", "verification_notes", "verified_at", "is_active",
                  "owner_email", "created_at"]

    def get_owner_email(self, obj):
        member = obj.members.select_related("user").first()
        return member.user.email if member else None


class AdminOpportunitySerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    type_name = serializers.CharField(source="opportunity_type.name", read_only=True)

    class Meta:
        model = Opportunity
        fields = ["id", "title", "description", "organization", "organization_name", "type_name",
                  "status", "deadline", "positions", "moderation_note", "published_at", "created_at"]


class AdminActionLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source="actor.email", read_only=True, default=None)

    class Meta:
        model = AdminActionLog
        fields = ["id", "actor_email", "action", "target_type", "target_id", "note", "created_at"]
