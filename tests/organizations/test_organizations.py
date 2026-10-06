import pytest

from apps.accounts.constants import Role
from tests.conftest import auth, make_user


@pytest.mark.django_db
class TestOrganizations:
    def test_create_profile_and_submit_verification(self, api, taxonomy):
        client = auth(api, make_user("hr@new.co.tz", Role.ORGANIZATION))
        assert client.get("/api/v1/organizations/me/").status_code == 404
        r = client.post("/api/v1/organizations/me/", {"name": "NewCo", "description": "We build", "contact_email": "hr@new.co.tz",
                                                      "industry": taxonomy.industry.pk, "location": taxonomy.dar.pk}, format="json")
        assert r.status_code == 201 and r.data["verification_status"] == "unverified"
        assert client.post("/api/v1/organizations/me/", {"name": "Second"}, format="json").status_code == 409
        assert client.post("/api/v1/organizations/me/submit-verification/").data["verification_status"] == "pending"
        assert client.post("/api/v1/organizations/me/submit-verification/").status_code == 400

    def test_cannot_self_verify(self, make_org):
        client, org = make_org()
        client.patch("/api/v1/organizations/me/", {"verification_status": "verified"}, format="json")
        org.refresh_from_db()
        assert org.verification_status == "unverified"

    def test_incomplete_profile_cannot_submit(self, api):
        client = auth(api, make_user("hr@bare.co.tz", Role.ORGANIZATION))
        client.post("/api/v1/organizations/me/", {"name": "Bare"}, format="json")
        r = client.post("/api/v1/organizations/me/submit-verification/")
        assert r.status_code == 400 and r.data["error"]["code"] == "profile_incomplete"

    def test_creating_opportunity_requires_org_profile(self, api, taxonomy):
        client = auth(api, make_user("hr@none.co.tz", Role.ORGANIZATION))
        r = client.post("/api/v1/organizations/me/opportunities/", {}, format="json")
        assert r.status_code == 400 and r.data["error"]["code"] == "organization_required"

    def test_public_directory_lists_only_verified(self, api, make_org):
        make_org("a@a.co.tz", verified=True)
        make_org("b@b.co.tz", verified=False)
        assert api.get("/api/v1/organizations/").data["count"] == 1
