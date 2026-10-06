from django.urls import path

from .views import PlatformStatsView

urlpatterns = [path("stats/", PlatformStatsView.as_view(), name="admin-stats")]
