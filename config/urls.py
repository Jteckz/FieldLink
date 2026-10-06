from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

api_v1 = [
    path("auth/", include("apps.accounts.urls")),
    path("taxonomy/", include("apps.taxonomy.urls")),
    path("", include("apps.profiles.urls")),
    path("", include("apps.organizations.urls")),
    path("", include("apps.opportunities.urls")),
    path("", include("apps.applications.urls")),
    path("admin/", include("apps.moderation.urls")),
    path("admin/", include("apps.analytics.urls")),
]

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]
