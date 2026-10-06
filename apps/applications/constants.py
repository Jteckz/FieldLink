from django.db import models


class ApplicationStatus(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    REVIEWING = "reviewing", "Reviewing"
    SHORTLISTED = "shortlisted", "Shortlisted"
    INTERVIEW = "interview", "Interview"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"
    WITHDRAWN = "withdrawn", "Withdrawn"


A = ApplicationStatus

# Allowed moves (who may make them is decided separately below).
TRANSITIONS = {
    A.SUBMITTED: {A.REVIEWING, A.REJECTED, A.WITHDRAWN},
    A.REVIEWING: {A.SHORTLISTED, A.REJECTED, A.WITHDRAWN},
    A.SHORTLISTED: {A.INTERVIEW, A.ACCEPTED, A.REJECTED},
    A.INTERVIEW: {A.ACCEPTED, A.REJECTED},
    A.ACCEPTED: set(),
    A.REJECTED: set(),
    A.WITHDRAWN: set(),
}
STUDENT_ALLOWED = {A.WITHDRAWN}
ORGANIZATION_ALLOWED = {A.REVIEWING, A.SHORTLISTED, A.INTERVIEW, A.ACCEPTED, A.REJECTED}
