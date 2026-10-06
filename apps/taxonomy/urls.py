from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("institutions", views.InstitutionViewSet, basename="taxonomy-institution")
router.register("courses", views.CourseViewSet, basename="taxonomy-course")
router.register("skills", views.SkillViewSet, basename="taxonomy-skill")
router.register("industries", views.IndustryViewSet, basename="taxonomy-industry")
router.register("locations", views.LocationViewSet, basename="taxonomy-location")
router.register("opportunity-types", views.OpportunityTypeViewSet, basename="taxonomy-opportunity-type")

urlpatterns = router.urls
