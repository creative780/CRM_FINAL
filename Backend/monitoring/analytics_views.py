"""
Advanced analytics views for monitoring data
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Avg, Count, Sum, Q, Max, Min
from django.db.models.functions import TruncHour, TruncDay, TruncWeek
from monitoring.models import Device, Heartbeat, Screenshot
from accounts.permissions import RolePermission
import logging

logger = logging.getLogger(__name__)


class AnalyticsOverviewView(APIView):
    """Overview analytics for the monitoring system"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    
    def get(self, request):
        """Get overview analytics"""
        try:
            # Time ranges
            now = timezone.now()
            last_24h = now - timedelta(hours=24)
            last_7d = now - timedelta(days=7)
            last_30d = now - timedelta(days=30)
            
            # Device statistics
            total_devices = Device.objects.count()
            active_devices = Device.objects.filter(
                last_heartbeat__gte=last_24h
            ).count()
            online_devices = Device.objects.filter(status='ONLINE').count()
            idle_devices = Device.objects.filter(status='IDLE').count()
            offline_devices = Device.objects.filter(status='OFFLINE').count()
            
            # Activity statistics (last 24h)
            recent_heartbeats = Heartbeat.objects.filter(created_at__gte=last_24h)
            total_keystrokes = recent_heartbeats.aggregate(
                total=Sum('keystroke_count')
            )['total'] or 0
            total_clicks = recent_heartbeats.aggregate(
                total=Sum('mouse_click_count')
            )['total'] or 0
            avg_productivity = recent_heartbeats.aggregate(
                avg=Avg('productivity_score')
            )['avg'] or 0
            
            # Screenshot statistics
            total_screenshots = Screenshot.objects.filter(taken_at__gte=last_24h).count()
            
            # Top applications (last 24h)
            top_apps = recent_heartbeats.exclude(
                active_window__isnull=True
            ).exclude(
                active_window=''
            ).values('active_window').annotate(
                count=Count('id')
            ).order_by('-count')[:10]
            
            # Productivity trends (last 7 days)
            productivity_trends = recent_heartbeats.filter(
                created_at__gte=last_7d
            ).extra(
                select={'day': 'date(created_at)'}
            ).values('day').annotate(
                avg_productivity=Avg('productivity_score'),
                total_keystrokes=Sum('keystroke_count'),
                total_clicks=Sum('mouse_click_count')
            ).order_by('day')
            
            return Response({
                'overview': {
                    'total_devices': total_devices,
                    'active_devices': active_devices,
                    'online_devices': online_devices,
                    'idle_devices': idle_devices,
                    'offline_devices': offline_devices,
                },
                'activity_24h': {
                    'total_keystrokes': total_keystrokes,
                    'total_clicks': total_clicks,
                    'avg_productivity': round(avg_productivity, 2),
                    'total_screenshots': total_screenshots,
                },
                'top_applications': list(top_apps),
                'productivity_trends': list(productivity_trends),
            })
            
        except Exception as e:
            logger.error(f"Error in AnalyticsOverviewView: {e}")
            return Response(
                {'detail': 'Failed to fetch analytics data'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DeviceAnalyticsView(APIView):
    """Device-specific analytics"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    
    def get(self, request, device_id):
        """Get analytics for a specific device"""
        try:
            device = Device.objects.get(id=device_id)
            
            # Time ranges
            now = timezone.now()
            last_24h = now - timedelta(hours=24)
            last_7d = now - timedelta(days=7)
            last_30d = now - timedelta(days=30)
            
            # Device heartbeats
            heartbeats_24h = device.heartbeats.filter(created_at__gte=last_24h)
            heartbeats_7d = device.heartbeats.filter(created_at__gte=last_7d)
            heartbeats_30d = device.heartbeats.filter(created_at__gte=last_30d)
            
            # Activity metrics
            activity_24h = {
                'total_keystrokes': heartbeats_24h.aggregate(
                    total=Sum('keystroke_count')
                )['total'] or 0,
                'total_clicks': heartbeats_24h.aggregate(
                    total=Sum('mouse_click_count')
                )['total'] or 0,
                'avg_productivity': heartbeats_24h.aggregate(
                    avg=Avg('productivity_score')
                )['avg'] or 0,
                'avg_cpu': heartbeats_24h.aggregate(
                    avg=Avg('cpu_percent')
                )['avg'] or 0,
                'avg_memory': heartbeats_24h.aggregate(
                    avg=Avg('mem_percent')
                )['avg'] or 0,
            }
            
            # Hourly activity (last 24h)
            hourly_activity = heartbeats_24h.annotate(
                hour=TruncHour('created_at')
            ).values('hour').annotate(
                keystrokes=Sum('keystroke_count'),
                clicks=Sum('mouse_click_count'),
                productivity=Avg('productivity_score'),
                cpu=Avg('cpu_percent'),
                memory=Avg('mem_percent')
            ).order_by('hour')
            
            # Daily trends (last 7 days)
            daily_trends = heartbeats_7d.annotate(
                day=TruncDay('created_at')
            ).values('day').annotate(
                keystrokes=Sum('keystroke_count'),
                clicks=Sum('mouse_click_count'),
                productivity=Avg('productivity_score'),
                heartbeats=Count('id')
            ).order_by('day')
            
            # Top applications
            top_apps = heartbeats_24h.exclude(
                active_window__isnull=True
            ).exclude(
                active_window=''
            ).values('active_window').annotate(
                count=Count('id'),
                total_time=Sum('session_duration_minutes')
            ).order_by('-count')[:10]
            
            # Screenshot activity
            screenshots_24h = device.screenshots.filter(taken_at__gte=last_24h).count()
            screenshots_7d = device.screenshots.filter(taken_at__gte=last_7d).count()
            
            # Idle periods
            idle_periods = heartbeats_24h.filter(is_locked=True).count()
            active_periods = heartbeats_24h.filter(is_locked=False).count()
            
            return Response({
                'device': {
                    'id': device.id,
                    'hostname': device.hostname,
                    'os': device.os,
                    'status': device.status,
                    'current_user': device.current_user_name,
                },
                'activity_24h': activity_24h,
                'hourly_activity': list(hourly_activity),
                'daily_trends': list(daily_trends),
                'top_applications': list(top_apps),
                'screenshots': {
                    'last_24h': screenshots_24h,
                    'last_7d': screenshots_7d,
                },
                'idle_analysis': {
                    'idle_periods': idle_periods,
                    'active_periods': active_periods,
                    'idle_ratio': round(idle_periods / (idle_periods + active_periods) * 100, 2) if (idle_periods + active_periods) > 0 else 0,
                },
            })
            
        except Device.DoesNotExist:
            return Response(
                {'detail': 'Device not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error in DeviceAnalyticsView: {e}")
            return Response(
                {'detail': 'Failed to fetch device analytics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProductivityAnalyticsView(APIView):
    """Productivity analytics across all devices"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    
    def get(self, request):
        """Get productivity analytics"""
        try:
            # Time ranges
            now = timezone.now()
            last_24h = now - timedelta(hours=24)
            last_7d = now - timedelta(days=7)
            last_30d = now - timedelta(days=30)
            
            # Overall productivity metrics
            recent_heartbeats = Heartbeat.objects.filter(created_at__gte=last_24h)
            
            productivity_stats = {
                'avg_productivity': recent_heartbeats.aggregate(
                    avg=Avg('productivity_score')
                )['avg'] or 0,
                'max_productivity': recent_heartbeats.aggregate(
                    max=Max('productivity_score')
                )['max'] or 0,
                'min_productivity': recent_heartbeats.aggregate(
                    min=Min('productivity_score')
                )['min'] or 0,
                'total_keystrokes': recent_heartbeats.aggregate(
                    total=Sum('keystroke_count')
                )['total'] or 0,
                'total_clicks': recent_heartbeats.aggregate(
                    total=Sum('mouse_click_count')
                )['total'] or 0,
            }
            
            # Productivity by device
            device_productivity = Device.objects.filter(
                last_heartbeat__gte=last_24h
            ).annotate(
                avg_productivity=Avg('heartbeats__productivity_score'),
                total_keystrokes=Sum('heartbeats__keystroke_count'),
                total_clicks=Sum('heartbeats__mouse_click_count'),
                heartbeat_count=Count('heartbeats')
            ).filter(
                heartbeat_count__gt=0
            ).order_by('-avg_productivity')[:10]
            
            # Productivity trends (last 7 days)
            productivity_trends = recent_heartbeats.filter(
                created_at__gte=last_7d
            ).annotate(
                day=TruncDay('created_at')
            ).values('day').annotate(
                avg_productivity=Avg('productivity_score'),
                total_keystrokes=Sum('keystroke_count'),
                total_clicks=Sum('mouse_click_count'),
                device_count=Count('device', distinct=True)
            ).order_by('day')
            
            # Productivity distribution
            productivity_ranges = [
                {'range': '0-20', 'count': recent_heartbeats.filter(productivity_score__gte=0, productivity_score__lt=20).count()},
                {'range': '20-40', 'count': recent_heartbeats.filter(productivity_score__gte=20, productivity_score__lt=40).count()},
                {'range': '40-60', 'count': recent_heartbeats.filter(productivity_score__gte=40, productivity_score__lt=60).count()},
                {'range': '60-80', 'count': recent_heartbeats.filter(productivity_score__gte=60, productivity_score__lt=80).count()},
                {'range': '80-100', 'count': recent_heartbeats.filter(productivity_score__gte=80, productivity_score__lte=100).count()},
            ]
            
            # Top performers
            top_performers = device_productivity[:5]
            
            # Low performers
            low_performers = device_productivity.order_by('avg_productivity')[:5]
            
            return Response({
                'productivity_stats': productivity_stats,
                'device_productivity': [
                    {
                        'device_id': device.id,
                        'hostname': device.hostname,
                        'current_user': device.current_user_name,
                        'avg_productivity': round(device.avg_productivity or 0, 2),
                        'total_keystrokes': device.total_keystrokes or 0,
                        'total_clicks': device.total_clicks or 0,
                        'heartbeat_count': device.heartbeat_count,
                    }
                    for device in device_productivity
                ],
                'productivity_trends': list(productivity_trends),
                'productivity_distribution': productivity_ranges,
                'top_performers': [
                    {
                        'device_id': device.id,
                        'hostname': device.hostname,
                        'current_user': device.current_user_name,
                        'avg_productivity': round(device.avg_productivity or 0, 2),
                    }
                    for device in top_performers
                ],
                'low_performers': [
                    {
                        'device_id': device.id,
                        'hostname': device.hostname,
                        'current_user': device.current_user_name,
                        'avg_productivity': round(device.avg_productivity or 0, 2),
                    }
                    for device in low_performers
                ],
            })
            
        except Exception as e:
            logger.error(f"Error in ProductivityAnalyticsView: {e}")
            return Response(
                {'detail': 'Failed to fetch productivity analytics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UsagePatternsView(APIView):
    """Usage patterns and trends analysis"""
    permission_classes = [RolePermission]
    allowed_roles = ['admin']
    
    def get(self, request):
        """Get usage patterns analysis"""
        try:
            # Time ranges
            now = timezone.now()
            last_7d = now - timedelta(days=7)
            last_30d = now - timedelta(days=30)
            
            # Hourly usage patterns (last 7 days)
            hourly_patterns = Heartbeat.objects.filter(
                created_at__gte=last_7d
            ).annotate(
                hour=TruncHour('created_at')
            ).values('hour').annotate(
                activity_count=Count('id'),
                avg_productivity=Avg('productivity_score'),
                total_keystrokes=Sum('keystroke_count'),
                total_clicks=Sum('mouse_click_count')
            ).order_by('hour')
            
            # Daily usage patterns (last 30 days)
            daily_patterns = Heartbeat.objects.filter(
                created_at__gte=last_30d
            ).annotate(
                day=TruncDay('created_at')
            ).values('day').annotate(
                activity_count=Count('id'),
                device_count=Count('device', distinct=True),
                avg_productivity=Avg('productivity_score'),
                total_keystrokes=Sum('keystroke_count'),
                total_clicks=Sum('mouse_click_count')
            ).order_by('day')
            
            # Weekly patterns
            weekly_patterns = Heartbeat.objects.filter(
                created_at__gte=last_30d
            ).annotate(
                week=TruncWeek('created_at')
            ).values('week').annotate(
                activity_count=Count('id'),
                device_count=Count('device', distinct=True),
                avg_productivity=Avg('productivity_score'),
                total_keystrokes=Sum('keystroke_count'),
                total_clicks=Sum('mouse_click_count')
            ).order_by('week')
            
            # Application usage patterns
            app_usage = Heartbeat.objects.filter(
                created_at__gte=last_7d
            ).exclude(
                active_window__isnull=True
            ).exclude(
                active_window=''
            ).values('active_window').annotate(
                usage_count=Count('id'),
                total_time=Sum('session_duration_minutes'),
                avg_productivity=Avg('productivity_score')
            ).order_by('-usage_count')[:20]
            
            # Peak usage hours
            peak_hours = hourly_patterns.order_by('-activity_count')[:5]
            
            # Low usage hours
            low_hours = hourly_patterns.order_by('activity_count')[:5]
            
            return Response({
                'hourly_patterns': list(hourly_patterns),
                'daily_patterns': list(daily_patterns),
                'weekly_patterns': list(weekly_patterns),
                'application_usage': list(app_usage),
                'peak_hours': list(peak_hours),
                'low_hours': list(low_hours),
            })
            
        except Exception as e:
            logger.error(f"Error in UsagePatternsView: {e}")
            return Response(
                {'detail': 'Failed to fetch usage patterns'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
