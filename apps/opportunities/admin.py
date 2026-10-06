from django.contrib import admin, messages

from common.exceptions import DomainError

from . import services
from .models import Opportunity, OpportunityRequirement


class RequirementInline(admin.StackedInline):
    model = OpportunityRequirement
    extra = 0
    filter_horizontal = ("courses", "skills")


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "opportunity_type", "status", "deadline", "positions")
    list_filter = ("status", "opportunity_type", "is_paid")
    search_fields = ("title", "organization__name")
    readonly_fields = ("published_at", "reviewed_by", "reviewed_at")
    inlines = [RequirementInline]
    actions = ["approve", "suspend"]

    def _run(self, request, queryset, action, note):
        for opp in queryset:
            try:
                services.admin_action(opp, action, actor=request.user, note=note)
            except DomainError as exc:
                self.message_user(request, f"{opp}: {exc.detail}", messages.WARNING)

    @admin.action(description="Approve & publish selected opportunities")
    def approve(self, request, queryset):
        self._run(request, queryset, "approve", "Approved via admin")

    @admin.action(description="Suspend selected opportunities")
    def suspend(self, request, queryset):
        self._run(request, queryset, "suspend", "Suspended via admin")
