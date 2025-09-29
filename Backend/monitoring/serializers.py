from rest_framework import serializers
from django.db import models
from .models import (
    Employee, EmployeeActivity, EmployeeAsset, EmployeeSummary,
    Device, DeviceToken, Heartbeat, Screenshot, Session, Org, DeviceUserBind
)


class EmployeeAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeAsset
        fields = ['kind', 'path', 'created_at']


class EmployeeSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeSummary
        fields = ['date', 'keystrokes', 'clicks', 'active_minutes', 'idle_minutes', 'productivity']


class EmployeeSerializer(serializers.ModelSerializer):
    screenshots = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField()
    activityTimeline = serializers.SerializerMethodField()
    dailySummary = serializers.SerializerMethodField()
    lastScreenshot = serializers.SerializerMethodField()
    keystrokeCount = serializers.SerializerMethodField()
    mouseClicks = serializers.SerializerMethodField()
    activeTime = serializers.SerializerMethodField()
    idleTime = serializers.SerializerMethodField()
    activities = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'name', 'email', 'department', 'status', 'productivity',
            'screenshots', 'videos', 'activityTimeline', 'dailySummary',
            'lastScreenshot', 'keystrokeCount', 'mouseClicks', 'activeTime', 'idleTime', 'activities',
        ]

    def get_screenshots(self, obj):
        return [a.path for a in obj.assets.filter(kind='screenshot', deleted_at__isnull=True).order_by('-created_at')[:20]]

    def get_videos(self, obj):
        return [a.path for a in obj.assets.filter(kind='video', deleted_at__isnull=True).order_by('-created_at')[:5]]

    def get_activityTimeline(self, obj):
        # Simple 24-bucket timeline from last 24h
        buckets = [0] * 24
        qs = obj.activities.order_by('-when')[:1000]
        for a in qs:
            hour = a.when.hour
            buckets[hour] = buckets[hour] + a.delta_k + a.delta_c
        return buckets

    def get_dailySummary(self, obj):
        return EmployeeSummarySerializer(obj.summaries.order_by('-date')[:7], many=True).data

    def get_lastScreenshot(self, obj):
        if obj.last_screenshot_at:
            from django.utils import timezone
            now = timezone.now()
            diff = now - obj.last_screenshot_at
            if diff.total_seconds() < 60:
                return "Just now"
            elif diff.total_seconds() < 3600:
                return f"{int(diff.total_seconds() / 60)} min ago"
            else:
                return f"{int(diff.total_seconds() / 3600)} hour ago"
        return "Never"

    def get_keystrokeCount(self, obj):
        return obj.activities.aggregate(total=models.Sum('delta_k'))['total'] or 0

    def get_mouseClicks(self, obj):
        return obj.activities.aggregate(total=models.Sum('delta_c'))['total'] or 0

    def get_activeTime(self, obj):
        # Calculate from activities
        total_minutes = obj.activities.count() * 2  # Assume 2 minutes per activity
        hours = total_minutes // 60
        minutes = total_minutes % 60
        return f"{hours}h {minutes}m"

    def get_idleTime(self, obj):
        # Simple calculation based on status
        if obj.status == 'offline':
            return "8h 0m"
        elif obj.status == 'idle':
            return "1h 30m"
        else:
            return "0h 15m"

    def get_activities(self, obj):
        activities = obj.activities.order_by('-when')[:10]
        return [
            {
                'time': a.when.strftime('%H:%M'),
                'action': a.action or 'Activity',
                'application': a.application or 'System'
            }
            for a in activities
        ]


class TrackSerializer(serializers.Serializer):
    employeeIds = serializers.ListField(child=serializers.IntegerField())
    delta = serializers.DictField(child=serializers.IntegerField(), allow_empty=True)
    action = serializers.CharField(allow_blank=True, required=False)
    application = serializers.CharField(allow_blank=True, required=False)
    when = serializers.DateTimeField()


class ScreenshotUploadSerializer(serializers.Serializer):
    employeeIds = serializers.ListField(child=serializers.IntegerField())
    when = serializers.DateTimeField()
    imageDataUrl = serializers.CharField()


class ScreenshotDeleteSerializer(serializers.Serializer):
    employeeId = serializers.IntegerField()
    file = serializers.CharField()


# New monitoring system serializers
class OrgSerializer(serializers.ModelSerializer):
    class Meta:
        model = Org
        fields = '__all__'


class DeviceSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    org_name = serializers.CharField(source='org.name', read_only=True)
    latest_thumb = serializers.SerializerMethodField()
    current_user_email = serializers.CharField(source='current_user.email', read_only=True)

    class Meta:
        model = Device
        fields = '__all__'

    def get_user_name(self, obj):
        return f"{obj.current_user.first_name} {obj.current_user.last_name}".strip() if obj.current_user else None
    
    def get_latest_thumb(self, obj):
        last = obj.screenshots.order_by('-taken_at').first()
        return last.thumb_key if last else None


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = '__all__'


class DeviceUserBindSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceUserBind
        fields = '__all__'


class HeartbeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Heartbeat
        fields = '__all__'


class ScreenshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Screenshot
        fields = '__all__'


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'

