from django.db import models


class OpportunityStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_REVIEW = "pending_review", "Pending review"
    PUBLISHED = "published", "Published"
    CLOSED = "closed", "Closed"
    EXPIRED = "expired", "Expired"
    ARCHIVED = "archived", "Archived"
    SUSPENDED = "suspended", "Suspended"


S = OpportunityStatus

# action -> (allowed source statuses, target status)
ORG_ACTIONS = {
    "submit": ({S.DRAFT}, S.PENDING_REVIEW),
    "unpublish": ({S.PENDING_REVIEW, S.PUBLISHED}, S.DRAFT),
    "close": ({S.PUBLISHED}, S.CLOSED),
    "archive": ({S.DRAFT, S.CLOSED, S.EXPIRED}, S.ARCHIVED),
}
ADMIN_ACTIONS = {
    "approve": ({S.PENDING_REVIEW, S.SUSPENDED}, S.PUBLISHED),
    "reject": ({S.PENDING_REVIEW}, S.DRAFT),
    "suspend": ({S.PENDING_REVIEW, S.PUBLISHED}, S.SUSPENDED),
}
