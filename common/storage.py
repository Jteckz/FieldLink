from django.conf import settings
from django.core.files.storage import FileSystemStorage


class PrivateFileSystemStorage(FileSystemStorage):
    """Stores files outside MEDIA_ROOT with no public URL.

    Files are only reachable through authenticated download endpoints.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("location", settings.PRIVATE_MEDIA_ROOT)
        super().__init__(*args, **kwargs)

    def url(self, name):
        raise ValueError("Private files have no public URL; use the download endpoint.")


def get_private_storage():
    # Production: swap for an S3-compatible *private* bucket (django-storages)
    # and serve downloads via short-lived signed URLs.
    return PrivateFileSystemStorage()
