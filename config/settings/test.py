import tempfile

from .base import *  # noqa: F401,F403
from .base import REST_FRAMEWORK as _BASE_REST

DEBUG = False
SECRET_KEY = "insecure-test-key"
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
PRIVATE_MEDIA_ROOT = tempfile.mkdtemp(prefix="private_media_test_")
REST_FRAMEWORK = {
    **_BASE_REST,
    "DEFAULT_THROTTLE_RATES": {k: "100000/min" for k in _BASE_REST["DEFAULT_THROTTLE_RATES"]},
}
