from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from accounts.permissions import RolePermission
from .models import ActivityLog
from .serializers import ActivityLogSerializer


@extend_schema(
    operation_id='activity_logs_list',
    summary='List activity logs',
    description='Get activity logs with optional filtering',
    tags=['Activity Logs']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, RolePermission])
def activity_logs_list(request):
    """List activity logs"""
    queryset = ActivityLog.objects.select_related('user', 'content_type').all()
    
    # Filter by user if specified
    user_id = request.query_params.get('user')
    if user_id:
        queryset = queryset.filter(user_id=user_id)
    
    # Filter by action if specified
    action = request.query_params.get('action')
    if action:
        queryset = queryset.filter(action=action)
    
    # Filter by content type if specified
    content_type = request.query_params.get('content_type')
    if content_type:
        queryset = queryset.filter(content_type__model=content_type)
    
    # Filter by date range
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    if start_date:
        queryset = queryset.filter(created_at__date__gte=start_date)
    if end_date:
        queryset = queryset.filter(created_at__date__lte=end_date)
    
    # Search in description
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(description__icontains=search)
    
    # Order by created_at desc
    queryset = queryset.order_by('-created_at')
    
    # Limit to last 1000 records for performance
    queryset = queryset[:1000]
    
    serializer = ActivityLogSerializer(queryset, many=True)
    return Response(serializer.data)
