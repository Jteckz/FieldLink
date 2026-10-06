"""End-to-end walk through the MVP acceptance criteria (spec section 28)."""
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from tests.conftest import PASSWORD, opportunity_payload


@pytest.mark.django_db
def test_full_mvp_journey(taxonomy, admin_client, pdf_file):
    # 1. Student registers, completes profile, uploads CV
    api = APIClient()
    assert api.post("/api/v1/auth/register/", {"email": "amina@example.com", "password": PASSWORD, "role": "student",
                                              "account_type": "student", "full_name": "Amina Juma"}, format="json").status_code == 201
    tokens = api.post("/api/v1/auth/login/", {"email": "amina@example.com", "password": PASSWORD}, format="json").data
    student = APIClient(); student.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    student.patch("/api/v1/students/me/profile/", {"phone": "+255711111111", "institution": taxonomy.institution.pk,
                  "course": taxonomy.course.pk, "study_level": "bachelor", "year_of_study": 3}, format="json")
    student.put("/api/v1/students/me/skills/", [{"skill": taxonomy.python.pk}], format="json")
    assert student.post("/api/v1/students/me/cv/", {"file": pdf_file()}, format="multipart").status_code == 201
    assert student.get("/api/v1/students/me/").data["profile"]["is_complete"] is True

    # 2. Organization registers and creates an opportunity
    api.post("/api/v1/auth/register/", {"email": "hr@acme.co.tz", "password": PASSWORD, "role": "organization"}, format="json")
    org = APIClient()
    org.credentials(HTTP_AUTHORIZATION="Bearer " + api.post("/api/v1/auth/login/", {"email": "hr@acme.co.tz", "password": PASSWORD}, format="json").data["access"])
    org.post("/api/v1/organizations/me/", {"name": "Acme", "description": "Tech", "contact_email": "hr@acme.co.tz"}, format="json")
    org.post("/api/v1/organizations/me/submit-verification/")
    oid = org.post("/api/v1/organizations/me/opportunities/", opportunity_payload(taxonomy), format="json").data["id"]
    org.post(f"/api/v1/organizations/me/opportunities/{oid}/submit/")

    # 3. Admin verifies the org and publishes the opportunity
    org_id = org.get("/api/v1/organizations/me/").data["id"]
    admin_client.post(f"/api/v1/admin/organizations/{org_id}/approve/", {}, format="json")
    assert admin_client.post(f"/api/v1/admin/opportunities/{oid}/approve/", {}, format="json").data["status"] == "published"

    # 4. Student finds it via search/filter
    found = student.get("/api/v1/opportunities/", {"q": "software", "type": "internship", "location": taxonomy.dar.pk}).data
    assert [o["id"] for o in found["results"]] == [oid]

    # 5. Applies once only
    assert student.post(f"/api/v1/opportunities/{oid}/apply/", {"cover_letter": "Hi"}, format="json").status_code == 201
    assert student.post(f"/api/v1/opportunities/{oid}/apply/", {}, format="json").status_code == 409

    # 6. Organization sees the application and changes its status
    app = org.get("/api/v1/organizations/me/applications/").data["results"][0]
    assert org.post(f"/api/v1/organizations/me/applications/{app['id']}/status/", {"status": "reviewing"}, format="json").status_code == 200

    # 7. Student sees updated status
    assert student.get("/api/v1/applications/").data["results"][0]["status"] == "reviewing"

    # 8. Private CV is protected from unrelated users
    cv_url = student.get("/api/v1/students/me/").data["current_cv"]["download_url"]
    assert APIClient().get(cv_url).status_code == 401
    assert org.get(cv_url).status_code == 200  # the org that received the application

    # 9. Expired/closed opportunities cannot receive new applications
    from apps.opportunities.models import Opportunity
    Opportunity.objects.filter(pk=oid).update(deadline=timezone.localdate() - timedelta(days=1))
    assert student.get("/api/v1/opportunities/").data["count"] == 0
