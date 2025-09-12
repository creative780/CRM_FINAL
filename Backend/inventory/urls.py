from django.urls import path
from .views import InventoryItemsView, InventoryAdjustView

urlpatterns = [
    path('inventory/items', InventoryItemsView.as_view(), name='inventory-items'),
    path('inventory/adjust', InventoryAdjustView.as_view(), name='inventory-adjust'),
]
