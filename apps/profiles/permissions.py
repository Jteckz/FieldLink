from apps.accounts.constants import Role


def can_download_cv(user, cv):
    """Owner, admin, or a member of an organization the student applied to with this CV."""
    from apps.applications.models import Application
    from apps.organizations.selectors import get_user_organization

    if not user.is_authenticated:
        return False
    if user.is_superuser or user.role == Role.ADMIN:
        return True
    if cv.student.user_id == user.id:
        return True
    org = get_user_organization(user)
    if org is None:
        return False
    return Application.objects.filter(cv=cv, opportunity__organization=org).exists()
