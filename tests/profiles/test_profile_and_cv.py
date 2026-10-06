import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from tests.conftest import PDF, opportunity_payload


@pytest.mark.django_db
class TestProfile:
    def test_incomplete_profile_reports_missing_fields(self, register_student):
        client, _ = register_student(complete=False)
        data = client.get("/api/v1/students/me/profile/").data
        assert data["is_complete"] is False
        assert {"phone", "institution", "course", "study_level", "year_of_study"} <= set(data["missing_fields"])

    def test_complete_profile(self, register_student):
        client, _ = register_student()
        assert client.get("/api/v1/students/me/profile/").data["is_complete"] is True

    def test_skills_replace_and_preferences(self, register_student, taxonomy):
        client, _ = register_student()
        r = client.put("/api/v1/students/me/skills/", [
            {"skill": taxonomy.python.pk, "proficiency": "advanced"},
            {"skill": taxonomy.python.pk, "proficiency": "beginner"},   # duplicate collapses
            {"skill": taxonomy.django.pk}], format="json")
        assert r.status_code == 200 and len(r.data) == 2
        r = client.patch("/api/v1/students/me/preferences/", {
            "preferred_locations": [taxonomy.dar.pk], "preferred_opportunity_types": [taxonomy.field.pk]}, format="json")
        assert r.status_code == 200 and r.data["preferred_locations"] == [taxonomy.dar.pk]


@pytest.mark.django_db
class TestCV:
    def upload(self, client, f):
        return client.post("/api/v1/students/me/cv/", {"file": f}, format="multipart")

    def test_upload_valid_pdf_versions(self, register_student, pdf_file):
        client, _ = register_student()
        r1 = self.upload(client, pdf_file())
        r2 = self.upload(client, pdf_file("cv2.pdf"))
        assert r1.status_code == 201 and r2.status_code == 201
        assert (r1.data["version"], r2.data["version"]) == (1, 2)
        listing = client.get("/api/v1/students/me/cv/").data
        assert [c["is_current"] for c in listing] == [True, False]

    @pytest.mark.parametrize("name,content", [
        ("malware.exe", b"MZ\x90\x00"), ("cv.pdf", b"not really a pdf"), ("empty.pdf", b"")])
    def test_rejects_bad_files(self, register_student, name, content):
        client, _ = register_student()
        assert self.upload(client, SimpleUploadedFile(name, content)).status_code == 400

    def test_rejects_oversized(self, register_student, settings):
        settings.CV_MAX_UPLOAD_BYTES = 100
        client, _ = register_student()
        assert self.upload(client, SimpleUploadedFile("big.pdf", PDF)).status_code == 400

    def test_cv_has_no_public_url(self, register_student, pdf_file, api):
        client, _ = register_student()
        cv = self.upload(client, pdf_file()).data
        assert api.get(cv["download_url"]).status_code == 401

    def test_owner_can_download_others_cannot(self, register_student, pdf_file, make_org, admin_client):
        owner, _ = register_student("owner@example.com")
        other, _ = register_student("other@example.com")
        org_client, _ = make_org()
        cv = self.upload(owner, pdf_file()).data
        url = f"/api/v1/documents/cvs/{cv['id']}/download/"
        r = owner.get(url)
        assert r.status_code == 200 and b"".join(r.streaming_content).startswith(b"%PDF")
        assert other.get(url).status_code == 403
        assert org_client.get(url).status_code == 403      # no application -> no access
        assert admin_client.get(url).status_code == 200

    def test_org_with_application_can_download_other_org_cannot(self, register_student, pdf_file, make_org, published_opportunity):
        student, _ = register_student()
        cv = self.upload(student, pdf_file()).data
        oid, org_client = published_opportunity()
        assert student.post(f"/api/v1/opportunities/{oid}/apply/", {}, format="json").status_code == 201
        url = f"/api/v1/documents/cvs/{cv['id']}/download/"
        assert org_client.get(url).status_code == 200
        rival, _ = make_org("hr@rival.co.tz")
        assert rival.get(url).status_code == 403
