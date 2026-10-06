from .models import Organization


def get_user_organization(user):
    if not getattr(user, "is_authenticated", False):
        return None
    return Organization.objects.filter(members__user=user).first()


def is_org_member(user, organization):
    return organization.members.filter(user=user).exists()
