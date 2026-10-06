import pytest

from apps.accounts.models import User
from tests.conftest import PASSWORD, auth


@pytest.mark.django_db
class TestAuth:
    def test_student_registration_creates_profile(self, api):
        r = api.post("/api/v1/auth/register/", {"email": "A@Example.com", "password": PASSWORD,
                                                "role": "student", "account_type": "graduate", "full_name": "Neema"}, format="json")
        assert r.status_code == 201
        user = User.objects.get(email="a@example.com")
        assert user.student_profile.account_type == "graduate"

    def test_cannot_self_register_as_admin(self, api):
        r = api.post("/api/v1/auth/register/", {"email": "x@example.com", "password": PASSWORD, "role": "admin"}, format="json")
        assert r.status_code == 400
        assert r.data["error"]["code"] == "validation_error"
        assert not User.objects.filter(email="x@example.com").exists()

    def test_duplicate_email_is_case_insensitive(self, api, register_student):
        register_student("dup@example.com", complete=False)
        r = api.post("/api/v1/auth/register/", {"email": "DUP@example.com", "password": PASSWORD,
                                                "role": "student", "full_name": "X"}, format="json")
        assert r.status_code == 400

    def test_weak_password_rejected(self, api):
        r = api.post("/api/v1/auth/register/", {"email": "w@example.com", "password": "12345678",
                                                "role": "student", "full_name": "W"}, format="json")
        assert r.status_code == 400

    def test_login_and_me(self, api, register_student):
        client, _ = register_student(complete=False)
        r = client.get("/api/v1/auth/me/")
        assert r.status_code == 200 and r.data["role"] == "student"

    def test_me_requires_auth(self, api):
        r = api.get("/api/v1/auth/me/")
        assert r.status_code == 401
        assert r.data["error"]["code"] == "not_authenticated"

    def test_suspended_user_cannot_login(self, api, register_student):
        _, profile = register_student(complete=False)
        profile.user.is_active = False
        profile.user.save()
        r = api.post("/api/v1/auth/login/", {"email": profile.user.email, "password": PASSWORD}, format="json")
        assert r.status_code == 401

    def test_role_is_enforced_server_side(self, register_student):
        client, _ = register_student(complete=False)
        assert client.get("/api/v1/organizations/me/").status_code == 403
        assert client.get("/api/v1/admin/users/").status_code == 403
