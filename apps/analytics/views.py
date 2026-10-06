from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsPlatformAdmin

from .selectors import platform_stats


class PlatformStatsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        return Response(platform_stats())
