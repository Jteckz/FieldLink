from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from common.constants import StudyLevel

from .constants import OpportunityStatus


class Opportunity(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="opportunities")
    opportunity_type = models.ForeignKey("taxonomy.OpportunityType", on_delete=models.PROTECT, related_name="+")
    title = models.CharField(max_length=200)
    description = models.TextField()
    location = models.ForeignKey("taxonomy.Location", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    is_remote = models.BooleanField(default=False)
    duration_months = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(60)])
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(db_index=True)
    positions = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1)])
    is_paid = models.BooleanField(default=False)

    status = models.CharField(max_length=20, choices=OpportunityStatus.choices, default=OpportunityStatus.DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    moderation_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "opportunities"
        indexes = [models.Index(fields=["status", "deadline"])]
        constraints = [models.CheckConstraint(condition=models.Q(positions__gte=1), name="opportunity_positions_gte_1")]

    def __str__(self):
        return f"{self.title} ({self.organization})"

    @property
    def deadline_passed(self):
        return self.deadline < timezone.localdate()

    @property
    def is_open(self):
        return self.status == OpportunityStatus.PUBLISHED and not self.deadline_passed


class OpportunityRequirement(models.Model):
    opportunity = models.OneToOneField(Opportunity, on_delete=models.CASCADE, related_name="requirements")
    courses = models.ManyToManyField("taxonomy.Course", blank=True, related_name="+")
    skills = models.ManyToManyField("taxonomy.Skill", blank=True, related_name="+")
    min_study_level = models.CharField(max_length=20, choices=StudyLevel.choices, blank=True)
    min_year_of_study = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(8)])
    students_eligible = models.BooleanField(default=True)
    graduates_eligible = models.BooleanField(default=True)
    eligibility_notes = models.TextField(blank=True)
