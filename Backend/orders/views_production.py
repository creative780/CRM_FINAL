from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .models import Order
from .serializers import OrderListSerializer
from accounts.permissions import RolePermission
from drf_spectacular.utils import extend_schema
from django.utils import timezone


class ProductionOrdersView(APIView):
    """
    Optimized endpoint for production orders.
    Returns only orders that are in production stage with efficient filtering.
    """
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'production']
    
    @extend_schema(
        summary="Get Production Orders",
        description="Get orders assigned to production with optimized filtering",
        responses={200: OrderListSerializer(many=True)}
    )
    def get(self, request):
        """Get orders that are in production stage"""
        
        try:
            # Filter for production orders only
            queryset = Order.objects.filter(
                Q(status='sent_to_production') |
                Q(status='getting_ready') |
                Q(stage='production') |
                Q(stage='printing')  # Include printing stage
            ).prefetch_related(
                'items', 
                'design_approvals',
                'machine_assignments'
            ).select_related('design_stage')
            
            # Order by most recent updates first
            queryset = queryset.order_by('-updated_at', '-created_at')
            
            # Serialize efficiently
            serializer = OrderListSerializer(queryset, many=True, context={'request': request})
            
            return Response({
                'count': queryset.count(),
                'results': serializer.data,
                'message': f'Found {queryset.count()} orders in production',
                'total_count': Order.objects.count()
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch production orders: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProductionOrderDetailView(APIView):
    """
    Detailed view for a specific production order with all necessary data.
    """
    permission_classes = [RolePermission]
    allowed_roles = ['admin', 'production']
    
    @extend_schema(
        summary="Get Production Order Details",
        description="Get detailed information for a production order",
        responses={200: OrderListSerializer}
    )
    def get(self, request, order_id):
        """Get detailed information for a production order"""
        
        try:
            order = Order.objects.select_related('design_stage').prefetch_related(
                'items', 
                'design_approvals', 
                'machine_assignments',
                'files'
            ).get(id=order_id)
            
            # Verify it's a production order
            if not (order.status in ['sent_to_production', 'getting_ready'] or 
                   order.stage in ['production', 'printing']):
                return Response(
                    {'error': 'Order is not in production stage'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = OrderListSerializer(order, context={'request': request})
            
            return Response({
                'order': serializer.data,
                'production_info': {
                    'status': order.status,
                    'stage': order.stage,
                    'has_approvals': order.design_approvals.exists(),
                    'latest_approval': order.design_approvals.first(),
                    'machine_assignments': order.machine_assignments.all()
                }
            })
            
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch order details: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

