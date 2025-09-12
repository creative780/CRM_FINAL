from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Prefetch
from drf_spectacular.utils import extend_schema
from accounts.permissions import RolePermission
from .models import ChatRoom, ChatRoomMember, ChatMessage
from .serializers import ChatRoomSerializer, ChatMessageSerializer, CreateChatRoomSerializer


@extend_schema(
    operation_id='chat_rooms_list',
    summary='List chat rooms',
    description='Get chat rooms the user is a member of',
    tags=['Chat']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, RolePermission])
def chat_rooms_list(request):
    """List chat rooms for current user"""
    user_rooms = ChatRoom.objects.filter(
        members=request.user,
        is_active=True
    ).prefetch_related(
        Prefetch('messages', queryset=ChatMessage.objects.select_related('sender').order_by('-created_at')[:1])
    ).order_by('-updated_at')
    
    serializer = ChatRoomSerializer(user_rooms, many=True)
    return Response(serializer.data)


@extend_schema(
    operation_id='chat_rooms_create',
    summary='Create chat room',
    description='Create a new chat room',
    tags=['Chat']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, RolePermission])
def chat_rooms_create(request):
    """Create a new chat room"""
    serializer = CreateChatRoomSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    room = serializer.save(created_by=request.user)
    
    # Add creator as admin member
    ChatRoomMember.objects.create(
        room=room,
        user=request.user,
        is_admin=True
    )
    
    return Response(ChatRoomSerializer(room).data, status=status.HTTP_201_CREATED)


@extend_schema(
    operation_id='chat_room_detail',
    summary='Get chat room details',
    description='Get chat room details and members',
    tags=['Chat']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, RolePermission])
def chat_room_detail(request, room_id):
    """Get chat room details"""
    try:
        room = ChatRoom.objects.prefetch_related('members').get(
            id=room_id,
            members=request.user,
            is_active=True
        )
    except ChatRoom.DoesNotExist:
        return Response({'detail': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = ChatRoomSerializer(room)
    return Response(serializer.data)


@extend_schema(
    operation_id='chat_messages_list',
    summary='List chat messages',
    description='Get messages for a chat room',
    tags=['Chat']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, RolePermission])
def chat_messages_list(request, room_id):
    """Get messages for a chat room"""
    try:
        room = ChatRoom.objects.get(
            id=room_id,
            members=request.user,
            is_active=True
        )
    except ChatRoom.DoesNotExist:
        return Response({'detail': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get messages with pagination
    limit = int(request.query_params.get('limit', 50))
    offset = int(request.query_params.get('offset', 0))
    
    messages = ChatMessage.objects.filter(room=room).select_related('sender', 'reply_to').order_by('-created_at')[offset:offset+limit]
    
    serializer = ChatMessageSerializer(messages, many=True)
    return Response(serializer.data)


@extend_schema(
    operation_id='chat_messages_create',
    summary='Send chat message',
    description='Send a message to a chat room',
    tags=['Chat']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, RolePermission])
def chat_messages_create(request, room_id):
    """Send a message to a chat room"""
    try:
        room = ChatRoom.objects.get(
            id=room_id,
            members=request.user,
            is_active=True
        )
    except ChatRoom.DoesNotExist:
        return Response({'detail': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = ChatMessageSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    message = serializer.save(room=room, sender=request.user)
    
    # Update room's updated_at timestamp
    room.save(update_fields=['updated_at'])
    
    return Response(ChatMessageSerializer(message).data, status=status.HTTP_201_CREATED)
