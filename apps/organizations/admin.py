from django.contrib import admin, messages

from common.exceptions import DomainError

from . import services
from .models import Organization, OrganizationMember


class MemberInline(admin.TabularInline):
    model = OrganizationMember
    extra = 0


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "industry", "location", "verification_status", "is_active", "created_at")
    list_filter = ("verification_status", "is_active", "industry")
    search_fields = ("name", "contact_email", "registration_number")
    readonly_fields = ("verified_at", "verified_by")
    inlines = [MemberInline]
    actions = ["approve_verification", "reject_verification"]

    @admin.action(description="Approve verification of selected organizations")
    def approve_verification(self, request, queryset):
        for org in queryset:
            try:
                services.approve_verification(org, actor=request.user, note="Approved via admin")
            except DomainError as exc:
                self.message_user(request, f"{org}: {exc.detail}", messages.WARNING)

    @admin.action(description="Reject verification of selected organizations")
    def reject_verification(self, request, queryset):
        for org in queryset:
            try:
                services.reject_verification(org, actor=request.user, note="Rejected via admin - see organization notes")
            except DomainError as exc:
                self.message_user(request, f"{org}: {exc.detail}", messages.WARNING)
