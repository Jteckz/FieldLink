from rest_framework import serializers

from . import models


class TaxonomySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Course
        fields = ["id", "name", "slug"]


class InstitutionSerializer(TaxonomySerializer):
    class Meta:
        model = models.Institution
        fields = ["id", "name", "slug", "short_name"]


class SkillSerializer(TaxonomySerializer):
    class Meta:
        model = models.Skill
        fields = ["id", "name", "slug", "category"]


class LocationSerializer(TaxonomySerializer):
    class Meta:
        model = models.Location
        fields = ["id", "name", "region", "slug"]


class OpportunityTypeSerializer(TaxonomySerializer):
    class Meta:
        model = models.OpportunityType
        fields = ["id", "name", "slug", "description"]
