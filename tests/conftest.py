from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.constants import Role
from apps.accounts.models import User
from apps.organizations import services as org_services
from apps.taxonomy import models as tx

PASSWORD = "Str0ng-Pass-123"
PDF = b"%PDF-1.4\n%fake pdf for tests\n" + b"0" * 200


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def taxonomy(db):
    t = type("Taxonomy", (), {})()
    t.institution = tx.Institution.objects.create(name="Dar es Salaam Institute of Technology", short_name="DIT")
    t.course = tx.Course.objects.create(name="Computer Science")
    t.other_course = tx.Course.objects.create(name="Civil Engineering")
    t.python = tx.Skill.objects.create(name="Python")
    t.django = tx.Skill.objects.create(name="Django")
    t.dar = tx.Location.objects.create(name="Dar es Salaam", region="Dar es Salaam")
    t.arusha = tx.Location.objects.create(name="Arusha", region="Arusha")
    t.industry = tx.Industry.objects.create(name="Information Technology")
    t.internship = tx.OpportunityType.objects.create(name="Internship")
    t.field = tx.OpportunityType.objects.create(name="Field Training")
    return t


def auth(client, user):
    resp = client.post("/api/v1/auth/login/", {"email": user.email, "password": PASSWORD}, format="json")
    assert resp.status_code == 200, resp.content
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    return c


def make_user(email, role):
    return User.objects.create_user(email=email, password=PASSWORD, role=role)


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(email="admin@example.com", password=PASSWORD)


@pytest.fixture
def admin_client(api, admin_user):
    return auth(api, admin_user)


@pytest.fixture
def register_student(api, taxonomy):
    """Registers via the API, completes the profile, returns (client, profile)."""

    def _make(email="student@example.com", account_type="student", complete=True, **profile):
        r = api.post("/api/v1/auth/register/", {
            "email": email, "password": PASSWORD, "role": "student",
            "account_type": account_type, "full_name": "Asha Mushi"}, format="json")
        assert r.status_code == 201, r.content
        client = auth(api, User.objects.get(email=email))
        if complete:
            data = {"phone": "+255700000000", "institution": taxonomy.institution.pk,
                    "course": taxonomy.course.pk, "study_level": "bachelor"}
            data.update({"graduation_year": 2025} if account_type == "graduate" else {"year_of_study": 3})
            data.update(profile)
            assert client.patch("/api/v1/students/me/profile/", data, format="json").status_code == 200
        return client, User.objects.get(email=email).student_profile

    return _make


@pytest.fixture
def make_org(db, taxonomy):
    """Creates an org user + organization, returns (client, organization)."""

    def _make(email="hr@acme.co.tz", verified=False):
        user = make_user(email, Role.ORGANIZATION)
        org = org_services.create_organization(
            owner=user, name="Acme Tech", description="Software company", contact_email=email,
            industry=taxonomy.industry, location=taxonomy.dar)
        if verified:
            org.verification_status = "verified"
            org.save()
        return auth(APIClient(), user), org

    return _make


def opportunity_payload(taxonomy, **over):
    data = {
        "opportunity_type": taxonomy.internship.pk, "title": "Software Engineering Intern",
        "description": "Work with our Django team on real products.", "location": taxonomy.dar.pk,
        "deadline": str(timezone.localdate() + timedelta(days=14)), "positions": 2,
        "requirements": {"courses": [taxonomy.course.pk], "skills": [taxonomy.python.pk, taxonomy.django.pk],
                         "min_study_level": "diploma"},
    }
    data.update(over)
    return data


@pytest.fixture
def published_opportunity(taxonomy, make_org, admin_client):
    """An opportunity that an organization created and an admin published."""

    def _make(org_client=None, **over):
        if org_client is None:
            org_client, _ = make_org()
        r = org_client.post("/api/v1/organizations/me/opportunities/", opportunity_payload(taxonomy, **over), format="json")
        assert r.status_code == 201, r.content
        oid = r.data["id"]
        assert org_client.post(f"/api/v1/organizations/me/opportunities/{oid}/submit/").status_code == 200
        assert admin_client.post(f"/api/v1/admin/opportunities/{oid}/approve/", {}, format="json").status_code == 200
        return oid, org_client

    return _make


@pytest.fixture
def pdf_file():
    return lambda name="cv.pdf": SimpleUploadedFile(name, PDF, content_type="application/pdf")
