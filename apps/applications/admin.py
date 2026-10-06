from django.contrib import admin

from .models import Application, ApplicationEvent


class EventInline(admin.TabularInline):
    model = ApplicationEvent
    extra = 0
    readonly_fields = ("old_status", "new_status", "actor", "note", "created_at")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("student", "opportunity", "status", "submitted_at")
    list_filter = ("status",)
    search_fields = ("student__full_name", "opportunity__title")
    readonly_fields = ("student", "opportunity", "cv", "cover_letter", "status", "submitted_at", "status_updated_at")
    inlines = [EventInline]
