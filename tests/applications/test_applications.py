from datetime import timedelta

import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.applications.models import Application, ApplicationEvent
from apps.opportunities.models import Opportunity


def apply(client, oid, **body):
    return client.post(f"/api/v1/opportunities/{oid}/apply/", body, format="json")


def set_status(org_client, app_id, status, note=""):
    return org_client.post(f"/api/v1/organizations/me/applications/{app_id}/status/", {"status": status, "note": note}, format="json")


@pytest.mark.django_db
class TestApplying:
    def test_apply_and_track(self, register_student, published_opportunity):
        student, _ = register_student()
        oid, _ = published_opportunity()
        r = apply(student, oid, cover_letter="I love Django")
        assert r.status_code == 201 and r.data["status"] == "submitted"
        listing = student.get("/api/v1/applications/").data
        assert listing["count"] == 1 and listing["results"][0]["opportunity"]["id"] == oid

    def test_only_one_application_per_opportunity(self, register_student, published_opportunity):
        student, profile = register_student()
        oid, _ = published_opportunity()
        assert apply(student, oid).status_code == 201
        r = apply(student, oid)
        assert r.status_code == 409 and r.data["error"]["code"] == "already_applied"
        assert Application.objects.count() == 1

    def test_db_constraint_blocks_duplicates(self, register_student, published_opportunity):
        student, profile = register_student()
        oid, _ = published_opportunity()
        apply(student, oid)
        with pytest.raises(IntegrityError), transaction.atomic():
            Application.objects.create(student=profile, opportunity_id=oid)

    def test_cannot_apply_after_deadline(self, register_student, published_opportunity):
        student, _ = register_student()
        oid, _ = published_opportunity()
        Opportunity.objects.filter(pk=oid).update(deadline=timezone.localdate() - timedelta(days=1))
        r = apply(student, oid)
        assert r.status_code == 400 and r.data["error"]["code"] == "deadline_passed"

    def test_can_apply_on_deadline_day(self, register_student, published_opportunity):
        student, _ = register_student()
        oid, _ = published_opportunity()
        Opportunity.objects.filter(pk=oid).update(deadline=timezone.localdate())
        assert apply(student, oid).status_code == 201

    @pytest.mark.parametrize("new_status", ["closed", "suspended", "draft"])
    def test_cannot_apply_to_non_published(self, register_student, published_opportunity, new_status):
        student, _ = register_student()
        oid, _ = published_opportunity()
        Opportunity.objects.filter(pk=oid).update(status=new_status)
        r = apply(student, oid)
        assert r.status_code == 400 and r.data["error"]["code"] == "opportunity_not_open"

    def test_incomplete_profile_blocked(self, register_student, published_opportunity):
        student, _ = register_student("inc@example.com", complete=False)
        oid, _ = published_opportunity()
        r = apply(student, oid)
        assert r.status_code == 400 and r.data["error"]["code"] == "profile_incomplete"

    def test_org_users_cannot_apply(self, make_org, published_opportunity):
        oid, org_client = published_opportunity()
        assert apply(org_client, oid).status_code == 403

    def test_eligibility_rules_are_explicit(self, taxonomy, register_student, make_org, published_opportunity):
        org_client, _ = make_org()
        grads_only, _ = published_opportunity(org_client, requirements={"students_eligible": False})
        year4, _ = published_opportunity(org_client, title="Y4", requirements={"min_year_of_study": 4})
        bachelor, _ = published_opportunity(org_client, title="B", requirements={"min_study_level": "masters"})
        student, _ = register_student()
        for oid in (grads_only, year4, bachelor):
            r = apply(student, oid)
            assert r.status_code == 400 and r.data["error"]["code"] == "not_eligible", oid
        graduate, _ = register_student("grad@example.com", account_type="graduate")
        assert apply(graduate, grads_only).status_code == 201

    def test_saved_and_flags(self, api, register_student, published_opportunity):
        student, _ = register_student()
        oid, _ = published_opportunity()
        assert student.post(f"/api/v1/opportunities/{oid}/save/").status_code == 201
        assert student.post(f"/api/v1/opportunities/{oid}/save/").status_code == 201   # idempotent
        assert student.get("/api/v1/students/me/saved-opportunities/").data["count"] == 1
        item = student.get("/api/v1/opportunities/").data["results"][0]
        assert item["is_saved"] is True and item["has_applied"] is False
        assert student.delete(f"/api/v1/opportunities/{oid}/save/").status_code == 204
        assert student.get("/api/v1/students/me/saved-opportunities/").data["count"] == 0


@pytest.mark.django_db
class TestStatusWorkflow:
    @pytest.fixture
    def setup(self, register_student, published_opportunity):
        student, _ = register_student()
        oid, org_client = published_opportunity()
        app_id = apply(student, oid).data["id"]
        return student, org_client, app_id

    def test_happy_path_and_student_sees_it(self, setup):
        student, org, app_id = setup
        for s in ("reviewing", "shortlisted", "interview", "accepted"):
            assert set_status(org, app_id, s).status_code == 200, s
        detail = student.get(f"/api/v1/applications/{app_id}/").data
        assert detail["status"] == "accepted"
        assert [e["new_status"] for e in detail["events"]] == ["submitted", "reviewing", "shortlisted", "interview", "accepted"]

    def test_shortlisted_can_go_straight_to_accepted_or_rejected(self, setup):
        _, org, app_id = setup
        set_status(org, app_id, "reviewing"); set_status(org, app_id, "shortlisted")
        assert set_status(org, app_id, "rejected", "Position filled").status_code == 200
        assert ApplicationEvent.objects.filter(application_id=app_id, note="Position filled").exists()

    @pytest.mark.parametrize("bad", ["accepted", "shortlisted", "interview", "submitted"])
    def test_invalid_transitions_from_submitted(self, setup, bad):
        _, org, app_id = setup
        r = set_status(org, app_id, bad)
        assert r.status_code == 400 and r.data["error"]["code"] == "invalid_transition"

    def test_terminal_states_are_final(self, setup):
        _, org, app_id = setup
        set_status(org, app_id, "rejected")
        assert set_status(org, app_id, "reviewing").status_code == 400

    def test_org_cannot_set_withdrawn(self, setup):
        _, org, app_id = setup
        assert set_status(org, app_id, "withdrawn").status_code == 400

    def test_student_can_only_withdraw(self, setup):
        student, org, app_id = setup
        assert student.post(f"/api/v1/organizations/me/applications/{app_id}/status/", {"status": "accepted"}, format="json").status_code == 403
        assert student.post(f"/api/v1/applications/{app_id}/withdraw/").data["status"] == "withdrawn"
        assert set_status(org, app_id, "reviewing").status_code == 400

    def test_cannot_withdraw_after_shortlisted(self, setup):
        student, org, app_id = setup
        set_status(org, app_id, "reviewing"); set_status(org, app_id, "shortlisted")
        assert student.post(f"/api/v1/applications/{app_id}/withdraw/").status_code == 400

    def test_withdrawn_cannot_reapply(self, setup):
        student, org, app_id = setup
        oid = Application.objects.get(pk=app_id).opportunity_id
        student.post(f"/api/v1/applications/{app_id}/withdraw/")
        assert apply(student, oid).status_code == 409

    def test_other_org_and_other_student_are_locked_out(self, setup, make_org, register_student):
        student, org, app_id = setup
        rival, _ = make_org("rival@x.co.tz")
        stranger, _ = register_student("stranger@example.com")
        assert rival.get(f"/api/v1/organizations/me/applications/{app_id}/").status_code == 404
        assert set_status(rival, app_id, "reviewing").status_code == 404
        assert rival.get("/api/v1/organizations/me/applications/").data["count"] == 0
        assert stranger.get(f"/api/v1/applications/{app_id}/").status_code == 404
        assert stranger.post(f"/api/v1/applications/{app_id}/withdraw/").status_code == 404

    def test_org_dashboard_filters_and_applicant_detail(self, setup):
        _, org, app_id = setup
        listing = org.get("/api/v1/organizations/me/applications/", {"status": "submitted"}).data
        assert listing["count"] == 1 and listing["results"][0]["applicant_name"] == "Asha Mushi"
        detail = org.get(f"/api/v1/organizations/me/applications/{app_id}/").data
        assert detail["applicant"]["institution"] == "Dar es Salaam Institute of Technology"
