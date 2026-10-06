from datetime import timedelta

import pytest
from django.utils import timezone

from apps.opportunities.models import Opportunity
from apps.opportunities.services import expire_due_opportunities
from tests.conftest import opportunity_payload

ORG = "/api/v1/organizations/me/opportunities/"


@pytest.mark.django_db
class TestLifecycle:
    def test_draft_not_public_until_admin_approves(self, api, taxonomy, make_org, admin_client):
        org_client, _ = make_org()
        oid = org_client.post(ORG, opportunity_payload(taxonomy), format="json").data["id"]
        assert api.get("/api/v1/opportunities/").data["count"] == 0
        assert org_client.post(f"{ORG}{oid}/submit/").data["status"] == "pending_review"
        assert api.get("/api/v1/opportunities/").data["count"] == 0     # still hidden
        assert admin_client.post(f"/api/v1/admin/opportunities/{oid}/approve/", {}, format="json").status_code == 200
        assert api.get("/api/v1/opportunities/").data["count"] == 1
        assert api.get(f"/api/v1/opportunities/{oid}/").status_code == 200

    def test_org_cannot_approve_itself(self, taxonomy, make_org):
        org_client, _ = make_org()
        oid = org_client.post(ORG, opportunity_payload(taxonomy), format="json").data["id"]
        org_client.post(f"{ORG}{oid}/submit/")
        assert org_client.post(f"/api/v1/admin/opportunities/{oid}/approve/", {}, format="json").status_code == 403

    def test_only_drafts_are_editable_or_deletable(self, taxonomy, make_org):
        org_client, _ = make_org()
        oid = org_client.post(ORG, opportunity_payload(taxonomy), format="json").data["id"]
        assert org_client.patch(f"{ORG}{oid}/", {"title": "New title"}, format="json").status_code == 200
        org_client.post(f"{ORG}{oid}/submit/")
        r = org_client.patch(f"{ORG}{oid}/", {"title": "Sneaky edit"}, format="json")
        assert r.status_code == 400 and r.data["error"]["code"] == "not_editable"
        assert org_client.delete(f"{ORG}{oid}/").status_code == 400
        org_client.post(f"{ORG}{oid}/unpublish/")
        assert org_client.delete(f"{ORG}{oid}/").status_code == 204

    def test_validation_rules(self, taxonomy, make_org):
        org_client, _ = make_org()
        past = str(timezone.localdate() - timedelta(days=1))
        assert org_client.post(ORG, opportunity_payload(taxonomy, deadline=past), format="json").status_code == 400
        assert org_client.post(ORG, opportunity_payload(taxonomy, positions=0), format="json").status_code == 400

    def test_reject_requires_note_and_returns_to_draft(self, taxonomy, make_org, admin_client):
        org_client, _ = make_org()
        oid = org_client.post(ORG, opportunity_payload(taxonomy), format="json").data["id"]
        org_client.post(f"{ORG}{oid}/submit/")
        url = f"/api/v1/admin/opportunities/{oid}/reject/"
        assert admin_client.post(url, {}, format="json").status_code == 400
        r = admin_client.post(url, {"note": "Add a clearer description"}, format="json")
        assert r.data["status"] == "draft"
        assert org_client.get(f"{ORG}{oid}/").data["moderation_note"] == "Add a clearer description"

    def test_org_sees_only_own_opportunities(self, taxonomy, make_org):
        a, _ = make_org("a@a.co.tz")
        b, _ = make_org("b@b.co.tz")
        oid = a.post(ORG, opportunity_payload(taxonomy), format="json").data["id"]
        assert b.get(f"{ORG}{oid}/").status_code == 404
        assert b.get(ORG).data["count"] == 0

    def test_expiry_job_and_hidden_after_deadline(self, api, published_opportunity):
        oid, _ = published_opportunity()
        Opportunity.objects.filter(pk=oid).update(deadline=timezone.localdate() - timedelta(days=1))
        assert api.get("/api/v1/opportunities/").data["count"] == 0       # hidden even before the job runs
        assert expire_due_opportunities() == 1
        assert Opportunity.objects.get(pk=oid).status == "expired"

    def test_suspended_opportunity_hidden(self, api, published_opportunity, admin_client):
        oid, _ = published_opportunity()
        assert admin_client.post(f"/api/v1/admin/opportunities/{oid}/suspend/", {"note": "spam"}, format="json").status_code == 200
        assert api.get("/api/v1/opportunities/").data["count"] == 0

    def test_auto_publish_for_verified_orgs_when_enabled(self, api, taxonomy, make_org, settings):
        settings.AUTO_PUBLISH_VERIFIED_ORGS = True
        org_client, _ = make_org(verified=True)
        oid = org_client.post(ORG, opportunity_payload(taxonomy), format="json").data["id"]
        assert org_client.post(f"{ORG}{oid}/submit/").data["status"] == "published"


@pytest.mark.django_db
class TestDiscovery:
    @pytest.fixture
    def seeded(self, taxonomy, make_org, published_opportunity):
        org_client, _ = make_org()
        a, _ = published_opportunity(org_client, title="Python Intern")
        b, _ = published_opportunity(org_client, title="Civil Site Trainee", opportunity_type=taxonomy.field.pk,
                                     location=taxonomy.arusha.pk, is_paid=True,
                                     requirements={"courses": [taxonomy.other_course.pk], "min_study_level": "bachelor"})
        return a, b

    def ids(self, api, **params):
        return {o["id"] for o in api.get("/api/v1/opportunities/", params).data["results"]}

    def test_filters(self, api, taxonomy, seeded):
        a, b = seeded
        assert self.ids(api, type="internship") == {a}
        assert self.ids(api, type="field-training") == {b}
        assert self.ids(api, location=taxonomy.arusha.pk) == {b}
        assert self.ids(api, region="dar es salaam") == {a}
        assert self.ids(api, is_paid="true") == {b}
        assert self.ids(api, skill=taxonomy.python.pk) == {a}
        assert self.ids(api, course=taxonomy.other_course.pk) == {b}
        assert self.ids(api, study_level="diploma") == {a}          # b needs a bachelor
        assert self.ids(api, study_level="bachelor") == {a, b}

    def test_search_and_ordering(self, api, seeded):
        a, b = seeded
        assert self.ids(api, q="civil") == {b}
        assert self.ids(api, q="acme") == {a, b}
        ordered = api.get("/api/v1/opportunities/", {"ordering": "title"}).data["results"]
        assert [o["title"] for o in ordered] == ["Civil Site Trainee", "Python Intern"]

    def test_pagination_shape(self, api, seeded):
        data = api.get("/api/v1/opportunities/", {"page_size": 1}).data
        assert data["count"] == 2 and len(data["results"]) == 1 and data["next"]
