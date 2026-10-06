from django.contrib import admin

from .models import CVDocument, StudentProfile, StudentSkill


class StudentSkillInline(admin.TabularInline):
    model = StudentSkill
    extra = 0


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("full_name", "user", "account_type", "institution", "course", "study_level")
    list_filter = ("account_type", "study_level", "institution")
    search_fields = ("full_name", "user__email")
    inlines = [StudentSkillInline]


@admin.register(CVDocument)
class CVDocumentAdmin(admin.ModelAdmin):
    list_display = ("student", "original_name", "version", "is_current", "uploaded_at")
    readonly_fields = ("student", "original_name", "size", "version", "uploaded_at")
    exclude = ("file",)  # file contents are never exposed through admin links
