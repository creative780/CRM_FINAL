"""
URL configuration for crm_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('healthz', lambda r: JsonResponse({'ok': True})),

    path('api/auth/', include('accounts.urls')),
    path('api/', include('monitoring.urls')),
    path('api/', include('orders.urls')),
    path('api/', include('delivery.urls')),
    path('api/', include('inventory.urls')),
    path('api/', include('hr.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('clients.urls')),
    path('api/', include('dashboard.urls')),
    path('api/', include('attendance.urls')),
    # Ensure the new activity_log service owns /api/activity-logs/*
    path('api/', include('activity_log.urls')),
    path('api/', include('audit.urls')),
    path('api/', include('chat.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
