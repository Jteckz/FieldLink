import os

from django.http import FileResponse
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsStudent

from . import services
from .models import CVDocument
from .permissions import can_download_cv
from .serializers import (
    CVDocumentSerializer, CVUploadSerializer, PreferencesSerializer,
    StudentProfileSerializer, StudentSkillSerializer,
)


class StudentMeView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        profile = request.user.student_profile
        cv = services.get_current_cv(profile)
        return Response({
            "user": {"id": request.user.id, "email": request.user.email, "role": request.user.role},
            "profile": StudentProfileSerializer(profile).data,
            "current_cv": CVDocumentSerializer(cv, context={"request": request}).data if cv else None,
        })


class StudentProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsStudent]
    serializer_class = StudentProfileSerializer
    http_method_names = ["get", "put", "patch", "head", "options"]

    def get_object(self):
        return self.request.user.student_profile


class StudentPreferencesView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsStudent]
    serializer_class = PreferencesSerializer
    http_method_names = ["get", "put", "patch", "head", "options"]

    def get_object(self):
        return self.request.user.student_profile


class StudentSkillsView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        qs = request.user.student_profile.student_skills.select_related("skill")
        return Response(StudentSkillSerializer(qs, many=True).data)

    def put(self, request):
        serializer = StudentSkillSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        qs = services.replace_student_skills(request.user.student_profile, serializer.validated_data)
        return Response(StudentSkillSerializer(qs, many=True).data)


class CVListCreateView(APIView):
    permission_classes = [IsStudent]
    parser_classes = [MultiPartParser]
    throttle_scope = "uploads"

    def get(self, request):
        cvs = request.user.student_profile.cvs.all()
        return Response(CVDocumentSerializer(cvs, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = CVUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cv = services.upload_cv(request.user.student_profile, serializer.validated_data["file"])
        return Response(CVDocumentSerializer(cv, context={"request": request}).data, status=status.HTTP_201_CREATED)


class CVDownloadView(APIView):
    """The ONLY way to read a CV. Object-level permission is enforced here."""

    def get(self, request, pk):
        cv = CVDocument.objects.select_related("student__user").filter(pk=pk).first()
        if cv is None:
            raise NotFound()
        if not can_download_cv(request.user, cv):
            raise PermissionDenied("You do not have access to this document.")
        response = FileResponse(cv.file.open("rb"), as_attachment=True, filename=cv.original_name)
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        return response
