import pytest

from apps.moderation.models import AdminActionLog
from tests.conftest import PASSWORD


@pytest.mark.django_db
class TestAdminApi:
    def test_verify_and_reject_organization(self, api, admin_client, make_org):
        client, org = make_org()
        client.post("/api/v1/organizations/me/submit-verification/")
        assert admin_client.post(f"/api/v1/admin/organizations/{org.pk}/reject/", {}, format="json").status_code == 400  # note required
        r = admin_client.post(f"/api/v1/admin/organizations/{org.pk}/approve/", {"note": "BRELA checked"}, format="json")
        assert r.data["verification_status"] == "verified"
        assert api.get("/api/v1/organizations/").data["count"] == 1
        assert AdminActionLog.objects.filter(action="organization.verify", target_id=org.pk).exists()

    def test_suspend_user_blocks_login_and_hides_opportunities(self, api, admin_client, published_opportunity):
        oid, org_client = published_opportunity()
        owner = org_client.get("/api/v1/auth/me/").data
        assert admin_client.post(f"/api/v1/admin/users/{owner['id']}/suspend/", {"note": "abuse"}, format="json").status_code == 200
        assert api.post("/api/v1/auth/login/", {"email": owner["email"], "password": PASSWORD}, format="json").status_code == 401
        assert api.get("/api/v1/opportunities/").data["count"] == 0
        assert org_client.get("/api/v1/organizations/me/").status_code == 401        # live token rejected too

    def test_admins_cannot_be_suspended(self, admin_client, admin_user):
        assert admin_client.post(f"/api/v1/admin/users/{admin_user.pk}/suspend/", {}, format="json").status_code == 400

    def test_suspend_organization_hides_its_opportunities(self, api, admin_client, published_opportunity):
        oid, org_client = published_opportunity()
        org_id = org_client.get("/api/v1/organizations/me/").data["id"]
        admin_client.post(f"/api/v1/admin/organizations/{org_id}/suspend/", {"note": "fraud"}, format="json")
        assert api.get("/api/v1/opportunities/").data["count"] == 0

    def test_stats_and_audit_log(self, admin_client, published_opportunity, register_student):
        oid, _ = published_opportunity()
        student, _ = register_student()
        student.post(f"/api/v1/opportunities/{oid}/apply/", {}, format="json")
        stats = admin_client.get("/api/v1/admin/stats/").data
        assert stats["opportunities"]["by_status"]["published"] == 1
        assert stats["applications"]["total"] == 1
        log = admin_client.get("/api/v1/admin/audit-log/", {"action": "opportunity.approve"}).data
        assert log["count"] == 1

    def test_non_admin_blocked(self, register_student, make_org):
        student, _ = register_student()
        org, _ = make_org()
        for c in (student, org):
            assert c.get("/api/v1/admin/stats/").status_code == 403
