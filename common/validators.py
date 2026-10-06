import os

from django.conf import settings
from django.core.exceptions import ValidationError

from .constants import CV_ALLOWED_TYPES


def validate_cv_file(file):
    """Validate extension, size and real file signature (not just the name)."""
    ext = os.path.splitext(file.name)[1].lower().lstrip(".")
    if ext not in CV_ALLOWED_TYPES:
        raise ValidationError(
            "Unsupported file type. Upload a PDF, DOC or DOCX file.", code="invalid_type"
        )
    if file.size > settings.CV_MAX_UPLOAD_BYTES:
        limit_mb = settings.CV_MAX_UPLOAD_BYTES // (1024 * 1024)
        raise ValidationError(f"File too large. Maximum size is {limit_mb} MB.", code="too_large")
    if file.size == 0:
        raise ValidationError("The uploaded file is empty.", code="empty")

    head = file.read(8)
    file.seek(0)
    if not any(head.startswith(sig) for sig in CV_ALLOWED_TYPES[ext]):
        raise ValidationError(
            "File content does not match its extension.", code="signature_mismatch"
        )
