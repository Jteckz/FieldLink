from django.core.management.base import BaseCommand

from apps.opportunities.services import expire_due_opportunities


class Command(BaseCommand):
    help = "Mark published opportunities past their deadline as expired (run daily via cron/Celery beat)."

    def handle(self, *args, **options):
        self.stdout.write(f"Expired {expire_due_opportunities()} opportunities.")
