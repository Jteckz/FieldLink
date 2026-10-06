from rest_framework import serializers

from apps.opportunities.serializers import OpportunityListSerializer
from apps.profiles.serializers import CVDocumentSerializer

from .constants import ApplicationStatus
from .models import Application, ApplicationEvent, SavedOpportunity


class ApplyInputSerializer(serializers.Serializer):
    cover_letter = serializers.CharField(required=False, allow_blank=True, max_length=5000, default="")
    cv = serializers.IntegerField(required=False, allow_null=True, help_text="ID of one of your CVs; defaults to current.")


class StatusInputSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ApplicationStatus.choices)
    note = serializers.CharField(required=False, allow_blank=True, max_length=2000, default="")


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationEvent
        fields = ["old_status", "new_status", "note", "created_at"]


class StudentApplicationListSerializer(serializers.ModelSerializer):
    opportunity = OpportunityListSerializer(read_only=True)

    class Meta:
        model = Application
        fields = ["id", "status", "opportunity", "submitted_at", "status_updated_at"]


class StudentApplicationDetailSerializer(StudentApplicationListSerializer):
    events = EventSerializer(many=True, read_only=True)
    cv = CVDocumentSerializer(read_only=True)

    class Meta(StudentApplicationListSerializer.Meta):
        fields = StudentApplicationListSerializer.Meta.fields + ["cover_letter", "cv", "events"]


class SavedOpportunitySerializer(serializers.ModelSerializer):
    opportunity = OpportunityListSerializer(read_only=True)

    class Meta:
        model = SavedOpportunity
        fields = ["id", "opportunity", "created_at"]


# ---------------------------------------------------------- organization side
class ApplicantSerializer(serializers.Serializer):
    full_name = serializers.CharField()
    email = serializers.EmailField(source="user.email")
    phone = serializers.CharField()
    account_type = serializers.CharField()
    institution = serializers.CharField(source="institution.name", default=None)
    course = serializers.CharField(source="course.name", default=None)
    study_level = serializers.CharField()
    year_of_study = serializers.IntegerField()
    graduation_year = serializers.IntegerField()
    bio = serializers.CharField()
    skills = serializers.SerializerMethodField()

    def get_skills(self, obj):
        return [{"name": s.skill.name, "proficiency": s.proficiency} for s in obj.student_skills.all()]


class OrgApplicationListSerializer(serializers.ModelSerializer):
    applicant_name = serializers.CharField(source="student.full_name", read_only=True)
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)

    class Meta:
        model = Application
        fields = ["id", "status", "applicant_name", "opportunity", "opportunity_title", "submitted_at", "status_updated_at"]


class OrgApplicationDetailSerializer(OrgApplicationListSerializer):
    applicant = ApplicantSerializer(source="student", read_only=True)
    cv = CVDocumentSerializer(read_only=True)
    events = EventSerializer(many=True, read_only=True)

    class Meta(OrgApplicationListSerializer.Meta):
        fields = OrgApplicationListSerializer.Meta.fields + ["cover_letter", "applicant", "cv", "events"]
