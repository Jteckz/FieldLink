from django.db import models


class Role(models.TextChoices):
    STUDENT = "student", "Student / Graduate"
    ORGANIZATION = "organization", "Organization"
    UNIVERSITY = "university", "University / Institution"  # reserved for Phase 4
    ADMIN = "admin", "Platform Admin"


# Roles a person may self-register with. Never trust role data beyond this list.
SELF_REGISTRATION_ROLES = (Role.STUDENT, Role.ORGANIZATION)
