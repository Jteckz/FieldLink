from django.db import models


class StudyLevel(models.TextChoices):
    CERTIFICATE = "certificate", "Certificate"
    DIPLOMA = "diploma", "Diploma"
    BACHELOR = "bachelor", "Bachelor's degree"
    MASTERS = "masters", "Master's degree"
    PHD = "phd", "PhD"


# Ordinal ranking used for explicit, auditable eligibility checks.
STUDY_LEVEL_ORDER = {code: i for i, (code, _) in enumerate(StudyLevel.choices)}


def levels_at_or_below(level):
    rank = STUDY_LEVEL_ORDER[level]
    return [code for code, r in STUDY_LEVEL_ORDER.items() if r <= rank]


# Allowed CV uploads: extension -> accepted leading bytes ("magic numbers").
CV_ALLOWED_TYPES = {
    "pdf": (b"%PDF",),
    "docx": (b"PK\x03\x04",),
    "doc": (b"\xd0\xcf\x11\xe0",),
}
