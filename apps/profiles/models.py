import os
import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from common.constants import StudyLevel
from common.storage import get_private_storage
from common.validators import validate_cv_file


class AccountType(models.TextChoices):
    STUDENT = "student", "Student"
    GRADUATE = "graduate", "Graduate"


class Proficiency(models.TextChoices):
    BEGINNER = "beginner", "Beginner"
    INTERMEDIATE = "intermediate", "Intermediate"
    ADVANCED = "advanced", "Advanced"


class StudentProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="student_profile")
    account_type = models.CharField(max_length=10, choices=AccountType.choices, default=AccountType.STUDENT)
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True)
    institution = models.ForeignKey("taxonomy.Institution", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    course = models.ForeignKey("taxonomy.Course", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    study_level = models.CharField(max_length=20, choices=StudyLevel.choices, blank=True)
    year_of_study = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(8)])
    graduation_year = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1990), MaxValueValidator(2100)])
    bio = models.TextField(blank=True, max_length=2000)

    skills = models.ManyToManyField("taxonomy.Skill", through="StudentSkill", related_name="students")
    preferred_locations = models.ManyToManyField("taxonomy.Location", blank=True, related_name="+")
    preferred_opportunity_types = models.ManyToManyField("taxonomy.OpportunityType", blank=True, related_name="+")
    preferred_industries = models.ManyToManyField("taxonomy.Industry", blank=True, related_name="+")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.full_name or self.user.email

    def missing_fields(self):
        missing = [
            name
            for name in ("full_name", "phone", "institution_id", "course_id", "study_level")
            if not getattr(self, name)
        ]
        if self.account_type == AccountType.GRADUATE:
            if not self.graduation_year:
                missing.append("graduation_year")
        elif not self.year_of_study:
            missing.append("year_of_study")
        return [m.removesuffix("_id") for m in missing]

    @property
    def is_complete(self):
        return not self.missing_fields()


class StudentSkill(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="student_skills")
    skill = models.ForeignKey("taxonomy.Skill", on_delete=models.CASCADE, related_name="+")
    proficiency = models.CharField(max_length=15, choices=Proficiency.choices, default=Proficiency.INTERMEDIATE)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["student", "skill"], name="uniq_student_skill")]


def cv_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return f"cvs/{instance.student.user_id}/{uuid.uuid4().hex}{ext}"


class CVDocument(models.Model):
    class ParsedStatus(models.TextChoices):
        NOT_REQUESTED = "not_requested", "Not requested"  # CV parsing arrives in Phase 3
        PENDING = "pending", "Pending"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="cvs")
    file = models.FileField(upload_to=cv_upload_path, storage=get_private_storage, validators=[validate_cv_file])
    original_name = models.CharField(max_length=255)
    size = models.PositiveIntegerField(default=0)
    version = models.PositiveIntegerField(default=1)
    is_current = models.BooleanField(default=True)
    parsed_status = models.CharField(max_length=15, choices=ParsedStatus.choices, default=ParsedStatus.NOT_REQUESTED)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version"]
        constraints = [
            models.UniqueConstraint(fields=["student", "version"], name="uniq_cv_version"),
            models.UniqueConstraint(fields=["student"], condition=models.Q(is_current=True), name="uniq_current_cv"),
        ]
