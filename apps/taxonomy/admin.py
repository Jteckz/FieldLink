from django.contrib import admin

from . import models


class TaxonomyAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


admin.site.register(models.Institution, TaxonomyAdmin)
admin.site.register(models.Course, TaxonomyAdmin)
admin.site.register(models.Industry, TaxonomyAdmin)
admin.site.register(models.OpportunityType, TaxonomyAdmin)


@admin.register(models.Skill)
class SkillAdmin(TaxonomyAdmin):
    list_display = ("name", "category", "is_active")
    list_filter = ("category", "is_active")


@admin.register(models.Location)
class LocationAdmin(TaxonomyAdmin):
    list_display = ("name", "region", "is_active")
    list_filter = ("region", "is_active")
    search_fields = ("name", "region")
