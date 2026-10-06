from .models import Application


def student_applications(profile):
    return (
        Application.objects.filter(student=profile)
        .select_related("opportunity__organization", "opportunity__opportunity_type", "opportunity__location", "cv")
        .prefetch_related("events")
    )


def organization_applications(org):
    return (
        Application.objects.filter(opportunity__organization=org)
        .select_related("student__user", "student__institution", "student__course", "opportunity", "cv")
        .prefetch_related("student__student_skills__skill", "events")
    )
