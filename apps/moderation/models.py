from django.conf import settings
from django.db import models


class AdminActionLog(models.Model):
    """Audit trail for every administrative / moderation action."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="admin_actions"
    )
    action = models.CharField(max_length=60, db_index=True)
    target_type = models.CharField(max_length=60)
    target_id = models.PositiveBigIntegerField()
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["target_type", "target_id"])]

    def __str__(self):
        return f"{self.action} on {self.target_type}#{self.target_id}"
