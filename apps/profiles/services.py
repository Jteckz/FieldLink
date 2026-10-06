from django.db import transaction
from django.db.models import Max

from common.exceptions import DomainError

from .models import CVDocument, StudentSkill


def replace_student_skills(profile, items):
    """Replace the profile's skills with `items` = [{"skill": Skill, "proficiency": str}]."""
    seen = {}
    for item in items:
        seen[item["skill"].pk] = item  # last one wins on duplicates
    with transaction.atomic():
        profile.student_skills.all().delete()
        StudentSkill.objects.bulk_create(
            StudentSkill(student=profile, skill=i["skill"], proficiency=i.get("proficiency", "intermediate"))
            for i in seen.values()
        )
    return profile.student_skills.select_related("skill")


def upload_cv(profile, file):
    """Store a new CV version; older versions are kept (applications reference them)."""
    with transaction.atomic():
        last = profile.cvs.aggregate(m=Max("version"))["m"] or 0
        profile.cvs.filter(is_current=True).update(is_current=False)
        return CVDocument.objects.create(
            student=profile, file=file, original_name=file.name[:255], size=file.size, version=last + 1
        )


def get_current_cv(profile):
    return profile.cvs.filter(is_current=True).first()


def get_owned_cv(profile, cv_id):
    cv = profile.cvs.filter(pk=cv_id).first()
    if cv is None:
        raise DomainError("CV not found on your profile.", "cv_not_found")
    return cv
