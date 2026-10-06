import django_filters as df
from django.db.models import Q

from common.constants import StudyLevel, levels_at_or_below

from .models import Opportunity


class OpportunityFilter(df.FilterSet):
    type = df.CharFilter(field_name="opportunity_type__slug")
    location = df.NumberFilter(field_name="location_id")
    region = df.CharFilter(field_name="location__region", lookup_expr="iexact")
    organization = df.NumberFilter(field_name="organization_id")
    industry = df.NumberFilter(field_name="organization__industry_id")
    course = df.NumberFilter(method="filter_course")
    skill = df.NumberFilter(method="filter_skill")
    study_level = df.ChoiceFilter(choices=StudyLevel.choices, method="filter_study_level")
    is_paid = df.BooleanFilter()
    is_remote = df.BooleanFilter()
    deadline_before = df.DateFilter(field_name="deadline", lookup_expr="lte")
    deadline_after = df.DateFilter(field_name="deadline", lookup_expr="gte")
    q = df.CharFilter(method="filter_q", label="Search")

    class Meta:
        model = Opportunity
        fields = []

    def filter_course(self, qs, name, value):
        # Opportunities that name the course, or don't restrict by course at all.
        return qs.filter(Q(requirements__courses=value) | Q(requirements__courses__isnull=True)).distinct()

    def filter_skill(self, qs, name, value):
        return qs.filter(requirements__skills=value).distinct()

    def filter_study_level(self, qs, name, value):
        eligible = levels_at_or_below(value)
        return qs.filter(Q(requirements__min_study_level="") | Q(requirements__min_study_level__in=eligible))

    def filter_q(self, qs, name, value):
        return qs.filter(
            Q(title__icontains=value)
            | Q(description__icontains=value)
            | Q(organization__name__icontains=value)
            | Q(location__name__icontains=value)
            | Q(requirements__skills__name__icontains=value)
        ).distinct()
