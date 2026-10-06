from django.conf import settings
from django.db import models


class VerificationStatus(models.TextChoices):
    UNVERIFIED = "unverified", "Unverified"
    PENDING = "pending", "Pending review"
    VERIFIED = "verified", "Verified"
    REJECTED = "rejected", "Rejected"


class Organization(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    industry = models.ForeignKey("taxonomy.Industry", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    location = models.ForeignKey("taxonomy.Location", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    address = models.CharField(max_length=255, blank=True)
    website = models.URLField(blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    registration_number = models.CharField(max_length=100, blank=True, help_text="e.g. BRELA registration number")

    verification_status = models.CharField(max_length=12, choices=VerificationStatus.choices, default=VerificationStatus.UNVERIFIED, db_index=True)
    verification_notes = models.TextField(blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    is_active = models.BooleanField(default=True, help_text="Untick to suspend the organization.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def is_verified(self):
        return self.verification_status == VerificationStatus.VERIFIED


class OrganizationMember(models.Model):
    class MemberRole(models.TextChoices):
        OWNER = "owner", "Owner"
        RECRUITER = "recruiter", "Recruiter"  # reserved for multi-user orgs later

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="organization_memberships")
    role = models.CharField(max_length=10, choices=MemberRole.choices, default=MemberRole.OWNER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["organization", "user"], name="uniq_org_member")]
