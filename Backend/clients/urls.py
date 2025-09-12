from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, ContactViewSet, LeadViewSet, ClientViewSet

router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet, basename='organizations')
router.register(r'contacts', ContactViewSet, basename='contacts')
router.register(r'leads', LeadViewSet, basename='leads')
router.register(r'clients', ClientViewSet, basename='clients')

urlpatterns = [
    path('', include(router.urls)),
]
