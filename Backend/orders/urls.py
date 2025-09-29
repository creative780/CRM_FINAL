from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrdersViewSet, SendDeliveryCodeView, RiderPhotoUploadView,
    OrdersListView, OrderDetailView, QuotationView  # Legacy views
)

# Create router for ViewSet
router = DefaultRouter()
router.register(r'orders', OrdersViewSet, basename='orders')

urlpatterns = [
    # Main API routes using ViewSet
    path('', include(router.urls)),
    
    # Quotation endpoints
    path('orders/<int:order_id>/quotation/', QuotationView.as_view(), name='order-quotation'),
    
    # Delivery endpoints - matches frontend contracts
    path('send-delivery-code', SendDeliveryCodeView.as_view(), name='send-delivery-code'),
    path('delivery/rider-photo', RiderPhotoUploadView.as_view(), name='rider-photo-upload'),
    
    # Legacy routes for backward compatibility
    path('orders/', OrdersListView.as_view(), name='orders-list-legacy'),
    path('orders/<uuid:id>/', OrderDetailView.as_view(), name='orders-detail-legacy'),
]
