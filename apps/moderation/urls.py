from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("users", views.AdminUserViewSet, basename="admin-user")
router.register("organizations", views.AdminOrganizationViewSet, basename="admin-organization")
router.register("opportunities", views.AdminOpportunityViewSet, basename="admin-opportunity")
router.register("audit-log", views.AdminActionLogViewSet, basename="admin-audit-log")

urlpatterns = router.urls
