from django.utils import timezone
from rest_framework import serializers

from apps.organizations.serializers import OrganizationBriefSerializer
from apps.taxonomy.models import Course, Location, OpportunityType, Skill
from apps.taxonomy.serializers import LocationSerializer, OpportunityTypeSerializer, SkillSerializer, TaxonomySerializer

from . import services
from .models import Opportunity, OpportunityRequirement


# ---------------------------------------------------------------- public read
class PublicRequirementSerializer(serializers.ModelSerializer):
    courses = TaxonomySerializer(many=True, read_only=True)
    skills = SkillSerializer(many=True, read_only=True)

    class Meta:
        model = OpportunityRequirement
        fields = ["courses", "skills", "min_study_level", "min_year_of_study",
                  "students_eligible", "graduates_eligible", "eligibility_notes"]


class OpportunityListSerializer(serializers.ModelSerializer):
    opportunity_type = OpportunityTypeSerializer(read_only=True)
    organization = OrganizationBriefSerializer(read_only=True)
    location = LocationSerializer(read_only=True)
    is_saved = serializers.SerializerMethodField()
    has_applied = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = ["id", "title", "opportunity_type", "organization", "location", "is_remote",
                  "duration_months", "deadline", "positions", "is_paid", "published_at",
                  "is_saved", "has_applied"]

    def get_is_saved(self, obj):
        return obj.pk in self.context.get("saved_ids", ())

    def get_has_applied(self, obj):
        return obj.pk in self.context.get("applied_ids", ())


class OpportunityDetailSerializer(OpportunityListSerializer):
    requirements = PublicRequirementSerializer(read_only=True)

    class Meta(OpportunityListSerializer.Meta):
        fields = OpportunityListSerializer.Meta.fields + ["description", "start_date", "requirements"]


# ------------------------------------------------------ organization read/write
class RequirementWriteSerializer(serializers.ModelSerializer):
    courses = serializers.PrimaryKeyRelatedField(many=True, queryset=Course.objects.filter(is_active=True), required=False)
    skills = serializers.PrimaryKeyRelatedField(many=True, queryset=Skill.objects.filter(is_active=True), required=False)

    class Meta:
        model = OpportunityRequirement
        fields = ["courses", "skills", "min_study_level", "min_year_of_study",
                  "students_eligible", "graduates_eligible", "eligibility_notes"]

    def validate(self, attrs):
        students = attrs.get("students_eligible", True)
        graduates = attrs.get("graduates_eligible", True)
        if not students and not graduates:
            raise serializers.ValidationError("At least one of students or graduates must be eligible.")
        return attrs


class OrganizationOpportunitySerializer(serializers.ModelSerializer):
    opportunity_type = serializers.PrimaryKeyRelatedField(queryset=OpportunityType.objects.filter(is_active=True))
    location = serializers.PrimaryKeyRelatedField(queryset=Location.objects.filter(is_active=True), required=False, allow_null=True)
    requirements = RequirementWriteSerializer(required=False)
    application_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Opportunity
        fields = ["id", "opportunity_type", "title", "description", "location", "is_remote",
                  "duration_months", "start_date", "deadline", "positions", "is_paid",
                  "requirements", "status", "published_at", "moderation_note",
                  "application_count", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "published_at", "moderation_note", "created_at", "updated_at"]

    def validate_deadline(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("Deadline cannot be in the past.")
        return value

    def validate(self, attrs):
        if attrs.get("start_date") and attrs.get("deadline") and attrs["start_date"] < attrs["deadline"]:
            raise serializers.ValidationError({"start_date": "Start date cannot be before the application deadline."})
        return attrs

    def create(self, validated_data):
        requirements = validated_data.pop("requirements", None)
        return services.create_opportunity(
            organization=self.context["organization"], requirements=requirements, **validated_data
        )

    def update(self, instance, validated_data):
        requirements = validated_data.pop("requirements", None)
        return services.update_opportunity(instance, requirements=requirements, **validated_data)
