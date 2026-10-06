from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from . import models, serializers


class TaxonomyViewSet(viewsets.ReadOnlyModelViewSet):
    """Public, read-only reference data. Managed by admins in Django admin."""

    permission_classes = [AllowAny]
    search_fields = ["name"]
    ordering_fields = ["name"]

    def get_queryset(self):
        return self.model.objects.filter(is_active=True)


def _make(model, serializer, extra_search=()):
    return type(
        f"{model.__name__}ViewSet",
        (TaxonomyViewSet,),
        {"model": model, "serializer_class": serializer, "search_fields": ["name", *extra_search]},
    )


InstitutionViewSet = _make(models.Institution, serializers.InstitutionSerializer, ["short_name"])
CourseViewSet = _make(models.Course, serializers.TaxonomySerializer)
SkillViewSet = _make(models.Skill, serializers.SkillSerializer, ["category"])
IndustryViewSet = _make(models.Industry, serializers.TaxonomySerializer)
LocationViewSet = _make(models.Location, serializers.LocationSerializer, ["region"])
OpportunityTypeViewSet = _make(models.OpportunityType, serializers.OpportunityTypeSerializer)
