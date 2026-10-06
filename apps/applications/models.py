from django.conf import settings
from django.db import models

from .constants import ApplicationStatus


class Application(models.Model):
    student = models.ForeignKey("profiles.StudentProfile", on_delete=models.CASCADE, related_name="applications")
    opportunity = models.ForeignKey("opportunities.Opportunity", on_delete=models.CASCADE, related_name="applications")
    status = models.CharField(max_length=15, choices=ApplicationStatus.choices, default=ApplicationStatus.SUBMITTED, db_index=True)
    cover_letter = models.TextField(blank=True, max_length=5000)
    # CV snapshot: the exact version attached at submission time.
    cv = models.ForeignKey("profiles.CVDocument", null=True, blank=True, on_delete=models.SET_NULL, related_name="applications")
    submitted_at = models.DateTimeField(auto_now_add=True)
    status_updated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]
        constraints = [
            # Database-level guarantee: one application per student per opportunity.
            models.UniqueConstraint(fields=["student", "opportunity"], name="uniq_application_per_student_opportunity"),
        ]

    def __str__(self):
        return f"{self.student} -> {self.opportunity} [{self.status}]"


class ApplicationEvent(models.Model):
    """Append-only audit trail of every status change."""

    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="events")
    old_status = models.CharField(max_length=15, blank=True)
    new_status = models.CharField(max_length=15, choices=ApplicationStatus.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]


class SavedOpportunity(models.Model):
    student = models.ForeignKey("profiles.StudentProfile", on_delete=models.CASCADE, related_name="saved_opportunities")
    opportunity = models.ForeignKey("opportunities.Opportunity", on_delete=models.CASCADE, related_name="saves")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["student", "opportunity"], name="uniq_saved_opportunity")]
