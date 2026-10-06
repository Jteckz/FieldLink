from django.urls import path

from . import views

urlpatterns = [
    path("students/me/", views.StudentMeView.as_view(), name="student-me"),
    path("students/me/profile/", views.StudentProfileView.as_view(), name="student-profile"),
    path("students/me/skills/", views.StudentSkillsView.as_view(), name="student-skills"),
    path("students/me/preferences/", views.StudentPreferencesView.as_view(), name="student-preferences"),
    path("students/me/cv/", views.CVListCreateView.as_view(), name="student-cv"),
    path("documents/cvs/<int:pk>/download/", views.CVDownloadView.as_view(), name="cv-download"),
]
