from rest_framework import serializers

from apps.taxonomy.models import Industry, Location, OpportunityType, Skill

from .models import CVDocument, StudentProfile, StudentSkill


class StudentProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    institution_name = serializers.CharField(source="institution.name", read_only=True, default=None)
    course_name = serializers.CharField(source="course.name", read_only=True, default=None)
    is_complete = serializers.BooleanField(read_only=True)
    missing_fields = serializers.ListField(read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id", "email", "account_type", "full_name", "phone",
            "institution", "institution_name", "course", "course_name",
            "study_level", "year_of_study", "graduation_year", "bio",
            "is_complete", "missing_fields", "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def validate(self, attrs):
        account_type = attrs.get("account_type", getattr(self.instance, "account_type", None))
        if account_type == "graduate" and attrs.get("year_of_study"):
            raise serializers.ValidationError({"year_of_study": "Graduates do not have a year of study."})
        return attrs


class StudentSkillSerializer(serializers.ModelSerializer):
    skill = serializers.PrimaryKeyRelatedField(queryset=Skill.objects.filter(is_active=True))
    skill_name = serializers.CharField(source="skill.name", read_only=True)

    class Meta:
        model = StudentSkill
        fields = ["skill", "skill_name", "proficiency"]
        validators = []


class PreferencesSerializer(serializers.ModelSerializer):
    preferred_locations = serializers.PrimaryKeyRelatedField(many=True, queryset=Location.objects.filter(is_active=True), required=False)
    preferred_opportunity_types = serializers.PrimaryKeyRelatedField(many=True, queryset=OpportunityType.objects.filter(is_active=True), required=False)
    preferred_industries = serializers.PrimaryKeyRelatedField(many=True, queryset=Industry.objects.filter(is_active=True), required=False)

    class Meta:
        model = StudentProfile
        fields = ["preferred_locations", "preferred_opportunity_types", "preferred_industries"]


class CVDocumentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = CVDocument
        fields = ["id", "original_name", "size", "version", "is_current", "parsed_status", "uploaded_at", "download_url"]
        read_only_fields = fields

    def get_download_url(self, obj):
        request = self.context.get("request")
        path = f"/api/v1/documents/cvs/{obj.pk}/download/"
        return request.build_absolute_uri(path) if request else path


class CVUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        from common.validators import validate_cv_file

        validate_cv_file(value)
        return value
