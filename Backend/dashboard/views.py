from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
from drf_spectacular.utils import extend_schema
from accounts.permissions import RolePermission
from clients.models import Lead, Client
from orders.models import Order
from monitoring.models import Employee


@extend_schema(
    operation_id='dashboard_kpis',
    summary='Get dashboard KPIs',
    description='Returns key performance indicators for the dashboard',
    tags=['Dashboard']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, RolePermission])
def dashboard_kpis(request):
    """Get dashboard KPIs"""
    # Get date ranges
    now = timezone.now()
    today = now.date()
    this_month = now.replace(day=1)
    last_month = (this_month - timedelta(days=1)).replace(day=1)
    
    # Leads KPIs
    total_leads = Lead.objects.count()
    new_leads_today = Lead.objects.filter(created_at__date=today).count()
    won_leads_this_month = Lead.objects.filter(
        stage='won',
        created_at__gte=this_month
    ).count()
    won_leads_last_month = Lead.objects.filter(
        stage='won',
        created_at__gte=last_month,
        created_at__lt=this_month
    ).count()
    
    # Orders KPIs
    total_orders = Order.objects.count()
    orders_this_month = Order.objects.filter(created_at__gte=this_month).count()
    orders_last_month = Order.objects.filter(
        created_at__gte=last_month,
        created_at__lt=this_month
    ).count()
    
    # Revenue KPIs (from won leads)
    revenue_this_month = Lead.objects.filter(
        stage='won',
        created_at__gte=this_month
    ).aggregate(total=Sum('value'))['total'] or 0
    
    revenue_last_month = Lead.objects.filter(
        stage='won',
        created_at__gte=last_month,
        created_at__lt=this_month
    ).aggregate(total=Sum('value'))['total'] or 0
    
    # Calculate growth rates
    lead_growth = 0
    if won_leads_last_month > 0:
        lead_growth = ((won_leads_this_month - won_leads_last_month) / won_leads_last_month) * 100
    
    order_growth = 0
    if orders_last_month > 0:
        order_growth = ((orders_this_month - orders_last_month) / orders_last_month) * 100
    
    revenue_growth = 0
    if revenue_last_month > 0:
        revenue_growth = ((revenue_this_month - revenue_last_month) / revenue_last_month) * 100
    
    return Response({
        'leads': {
            'total': total_leads,
            'new_today': new_leads_today,
            'won_this_month': won_leads_this_month,
            'growth_rate': round(lead_growth, 1)
        },
        'orders': {
            'total': total_orders,
            'this_month': orders_this_month,
            'growth_rate': round(order_growth, 1)
        },
        'revenue': {
            'this_month': float(revenue_this_month),
            'growth_rate': round(revenue_growth, 1)
        },
        'employees': {
            'total': Employee.objects.count(),
            'active': Employee.objects.filter(status='active').count()
        }
    })


@extend_schema(
    operation_id='dashboard_recent_activity',
    summary='Get recent activity',
    description='Returns recent activity for the dashboard',
    tags=['Dashboard']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, RolePermission])
def dashboard_recent_activity(request):
    """Get recent activity"""
    # Recent leads
    recent_leads = Lead.objects.select_related('org', 'contact', 'owner').order_by('-created_at')[:5]
    leads_data = []
    for lead in recent_leads:
        leads_data.append({
            'id': lead.id,
            'title': lead.title or f"Lead for {lead.org.name if lead.org else 'Unknown'}",
            'stage': lead.stage,
            'value': float(lead.value),
            'created_at': lead.created_at,
            'owner': lead.owner.username if lead.owner else None,
            'org_name': lead.org.name if lead.org else None
        })
    
    # Recent orders
    recent_orders = Order.objects.order_by('-created_at')[:5]
    orders_data = []
    for order in recent_orders:
        orders_data.append({
            'id': order.id,
            'title': order.order_code,
            'stage': order.stage,
            'status': order.status,
            'created_at': order.created_at,
            'client_name': getattr(order, 'client_name', None)
        })
    
    # Recent clients
    recent_clients = Client.objects.select_related('org', 'account_owner').order_by('-created_at')[:5]
    clients_data = []
    for client in recent_clients:
        clients_data.append({
            'id': client.id,
            'name': client.org.name,
            'status': client.status,
            'created_at': client.created_at,
            'account_owner': client.account_owner.username if client.account_owner else None
        })
    
    return Response({
        'leads': leads_data,
        'orders': orders_data,
        'clients': clients_data
    })
