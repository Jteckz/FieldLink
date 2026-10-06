from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("opportunities", views.OpportunityViewSet, basename="opportunity")
router.register("organizations/me/opportunities", views.OrganizationOpportunityViewSet, basename="org-opportunity")

urlpatterns = router.urls
