from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from accounts.permissions import RolePermission
from .models import Attendance
from .serializers import AttendanceSerializer, CheckInSerializer, CheckOutSerializer


@extend_schema(
    operation_id='attendance_check_in',
    summary='Check in employee',
    description='Record employee check-in time',
    tags=['Attendance']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, RolePermission])
def check_in(request):
    """Check in employee"""
    serializer = CheckInSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    today = timezone.now().date()
    
    # Check if already checked in today
    existing = Attendance.objects.filter(
        employee=request.user,
        date=today,
        check_out__isnull=True
    ).first()
    
    if existing:
        return Response(
            {'detail': 'Already checked in today'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    attendance = Attendance.objects.create(
        employee=request.user,
        check_in=timezone.now(),
        date=today,
        notes=serializer.validated_data.get('notes', '')
    )
    
    return Response(AttendanceSerializer(attendance).data, status=status.HTTP_201_CREATED)


@extend_schema(
    operation_id='attendance_check_out',
    summary='Check out employee',
    description='Record employee check-out time',
    tags=['Attendance']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, RolePermission])
def check_out(request):
    """Check out employee"""
    serializer = CheckOutSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    today = timezone.now().date()
    
    # Find today's check-in
    attendance = Attendance.objects.filter(
        employee=request.user,
        date=today,
        check_out__isnull=True
    ).first()
    
    if not attendance:
        return Response(
            {'detail': 'No active check-in found for today'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    attendance.check_out = timezone.now()
    if serializer.validated_data.get('notes'):
        attendance.notes += f"\n{serializer.validated_data['notes']}"
    attendance.save()
    
    return Response(AttendanceSerializer(attendance).data)


@extend_schema(
    operation_id='attendance_list',
    summary='List attendance records',
    description='Get attendance records with optional filtering',
    tags=['Attendance']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, RolePermission])
def attendance_list(request):
    """List attendance records"""
    queryset = Attendance.objects.select_related('employee').all()
    
    # Filter by employee if specified
    employee_id = request.query_params.get('employee')
    if employee_id:
        queryset = queryset.filter(employee_id=employee_id)
    
    # Filter by date range
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    if start_date:
        queryset = queryset.filter(date__gte=start_date)
    if end_date:
        queryset = queryset.filter(date__lte=end_date)
    
    # Order by date desc
    queryset = queryset.order_by('-date', '-check_in')
    
    serializer = AttendanceSerializer(queryset, many=True)
    return Response(serializer.data)


@extend_schema(
    operation_id='attendance_me',
    summary='Get my attendance',
    description='Get current user attendance records',
    tags=['Attendance']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, RolePermission])
def attendance_me(request):
    """Get current user attendance records"""
    queryset = Attendance.objects.filter(employee=request.user).order_by('-date', '-check_in')
    
    # Filter by date range
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    if start_date:
        queryset = queryset.filter(date__gte=start_date)
    if end_date:
        queryset = queryset.filter(date__lte=end_date)
    
    serializer = AttendanceSerializer(queryset, many=True)
    return Response(serializer.data)
