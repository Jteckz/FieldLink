from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("organizations", views.PublicOrganizationViewSet, basename="organization")

urlpatterns = [
    path("organizations/me/", views.OrganizationMeView.as_view(), name="organization-me"),
    path("organizations/me/submit-verification/", views.SubmitVerificationView.as_view(), name="organization-submit-verification"),
    *router.urls,
]
