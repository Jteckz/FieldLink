from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("applications", views.StudentApplicationViewSet, basename="application")
router.register("organizations/me/applications", views.OrganizationApplicationViewSet, basename="org-application")

urlpatterns = [
    path("opportunities/<int:pk>/apply/", views.ApplyView.as_view(), name="opportunity-apply"),
    path("opportunities/<int:pk>/save/", views.SaveView.as_view(), name="opportunity-save"),
    path("students/me/saved-opportunities/", views.SavedOpportunityListView.as_view(), name="saved-opportunities"),
    *router.urls,
]
