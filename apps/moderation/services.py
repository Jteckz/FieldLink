from .models import AdminActionLog


def log_admin_action(actor, action, target, note=""):
    return AdminActionLog.objects.create(
        actor=actor if getattr(actor, "pk", None) else None,
        action=action,
        target_type=f"{target._meta.app_label}.{target._meta.model_name}",
        target_id=target.pk,
        note=note or "",
    )
