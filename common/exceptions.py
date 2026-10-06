"""Stable error format:  {"error": {"code": "...", "message": "...", "details": ...}}"""
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import exception_handler as drf_exception_handler


class DomainError(APIException):
    """A business-rule violation raised from the service layer (HTTP 400)."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The request could not be processed."
    default_code = "domain_error"

    def __init__(self, detail=None, code=None, extra=None):
        super().__init__(detail, code)
        self.extra = extra


class Conflict(DomainError):
    status_code = status.HTTP_409_CONFLICT
    default_code = "conflict"


_STATUS_CODES = {
    400: "bad_request",
    401: "not_authenticated",
    403: "permission_denied",
    404: "not_found",
    405: "method_not_allowed",
    429: "throttled",
}


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, ValidationError):
        code, message, details = "validation_error", "Validation failed.", response.data
    else:
        code = (
            exc.get_codes()
            if isinstance(exc, APIException) and isinstance(exc.get_codes(), str)
            else _STATUS_CODES.get(response.status_code, "error")
        )
        data = response.data
        message = str(data.get("detail")) if isinstance(data, dict) and "detail" in data else str(data)
        details = getattr(exc, "extra", None)

    response.data = {"error": {"code": code, "message": message, "details": details}}
    return response
