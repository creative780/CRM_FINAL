from django.urls import path
from .views import (
    OrdersCreateView, OrdersListView, OrderDetailView, OrderStagePatchView, MarkPrintedView,
    OrderQuotationView, OrderDesignView, OrderPrintView, OrderApprovalView, OrderDeliveryView
)

urlpatterns = [
    # Orders CRUD
    path('orders/', OrdersListView.as_view(), name='orders-list'),
    path('orders', OrdersCreateView.as_view(), name='orders-create'),
    path('orders/<int:id>/', OrderDetailView.as_view(), name='orders-detail'),
    
    # Order stages
    path('orders/<int:id>', OrderStagePatchView.as_view(), name='orders-stage-patch'),
    
    # Order stage details
    path('orders/<int:order_id>/quotation/', OrderQuotationView.as_view(), name='orders-quotation'),
    path('orders/<int:order_id>/design/', OrderDesignView.as_view(), name='orders-design'),
    path('orders/<int:order_id>/print/', OrderPrintView.as_view(), name='orders-print'),
    path('orders/<int:order_id>/approval/', OrderApprovalView.as_view(), name='orders-approval'),
    path('orders/<int:order_id>/delivery/', OrderDeliveryView.as_view(), name='orders-delivery'),
    
    # Actions
    path('orders/<int:id>/actions/mark-printed', MarkPrintedView.as_view(), name='orders-mark-printed'),
    path('decrement-inventory', MarkPrintedView.as_view(), name='legacy-decrement-inventory'),
]
