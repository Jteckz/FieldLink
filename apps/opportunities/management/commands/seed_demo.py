from datetime import timedelta

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.constants import Role
from apps.accounts.models import User
from apps.opportunities import services
from apps.opportunities.constants import OpportunityStatus
from apps.organizations import services as org_services
from apps.taxonomy import models as tx

PASSWORD = "Demo-Pass-12345"


class Command(BaseCommand):
    help = "Create demo admin / student / organization accounts and sample opportunities (DEBUG only)."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo only runs with DJANGO_DEBUG=true.")
        call_command("seed_taxonomy")

        admin, _ = User.objects.get_or_create(email="admin@demo.tz", defaults={"role": Role.ADMIN, "is_staff": True, "is_superuser": True})
        student, _ = User.objects.get_or_create(email="student@demo.tz", defaults={"role": Role.STUDENT})
        owner, _ = User.objects.get_or_create(email="hr@demo.tz", defaults={"role": Role.ORGANIZATION})
        for u in (admin, student, owner):
            u.set_password(PASSWORD)
            u.save()

        from apps.profiles.models import StudentProfile
        StudentProfile.objects.get_or_create(user=student, defaults={
            "full_name": "Demo Student", "phone": "+255700000001", "study_level": "bachelor", "year_of_study": 3,
            "institution": tx.Institution.objects.filter(short_name="DIT").first(),
            "course": tx.Course.objects.filter(name="Computer Science").first()})

        if not owner.organization_memberships.exists():
            org = org_services.create_organization(
                owner=owner, name="Demo Tech Ltd", description="A demo software company in Dar es Salaam.",
                contact_email="hr@demo.tz", industry=tx.Industry.objects.get(name="Information Technology"),
                location=tx.Location.objects.get(name="Dar es Salaam"))
            org.verification_status = "verified"
            org.save()
            for title, type_name in [("Backend Developer Intern", "Internship"), ("Field Training - Network Setup", "Field Study / Field Training")]:
                opp = services.create_opportunity(
                    organization=org, title=title, description=f"{title}: hands-on placement with mentorship.",
                    opportunity_type=tx.OpportunityType.objects.get(name=type_name),
                    location=tx.Location.objects.get(name="Dar es Salaam"),
                    deadline=timezone.localdate() + timedelta(days=30), positions=2,
                    requirements={"skills": list(tx.Skill.objects.filter(name__in=["Python", "SQL"]))})
                opp.status, opp.published_at = OpportunityStatus.PUBLISHED, timezone.now()
                opp.save()

        self.stdout.write(self.style.SUCCESS(
            f"Demo ready. Password for admin@demo.tz / student@demo.tz / hr@demo.tz: {PASSWORD}"))
