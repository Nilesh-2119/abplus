# Root URLs routing configuration
# Location: plms_backend/urls.py

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_home(request):
    return JsonResponse({
        "status": "online",
        "name": "AB+ Diagnostic PLMS API Backend",
        "version": "1.0.0",
        "endpoints": {
            "api": "/api/",
            "admin": "/admin/"
        }
    })

urlpatterns = [
    path('', api_home),
    path('admin/', admin.site.urls),
    path('api/', include('backend.urls')),
]
