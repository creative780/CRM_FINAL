from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import CursorPagination
from django.db.models import Q, Prefetch
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from .models import Conversation, Participant, Message, Prompt
from .serializers import (
    ConversationSerializer, CreateConversationSerializer, MessageSerializer,
    CreateMessageSerializer, UserResponseSerializer, BotResponseSerializer,
    PromptSerializer, TypingSerializer, ReadReceiptSerializer
)
from .services.bot import generate_reply
import uuid


class ConversationPagination(CursorPagination):
    page_size = 20
    ordering = '-updated_at'


@extend_schema(
    operation_id='conversations_list',
    summary='List conversations',
    description='Get conversations for the current user with cursor pagination',
    tags=['Chat']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversations_list(request):
    """List conversations for current user"""
    paginator = ConversationPagination()
    
    # Get conversations where user is a participant
    conversations = Conversation.objects.filter(
        participants__user=request.user,
        is_archived=False
    ).prefetch_related(
        Prefetch('participants', queryset=Participant.objects.select_related('user'))
    ).distinct()
    
    result_page = paginator.paginate_queryset(conversations, request)
    serializer = ConversationSerializer(result_page, many=True, context={'request': request})
    
    return paginator.get_paginated_response(serializer.data)


@extend_schema(
    operation_id='conversations_create',
    summary='Create conversation',
    description='Create a new conversation',
    tags=['Chat']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def conversations_create(request):
    """Create a new conversation"""
    serializer = CreateConversationSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        conversation = serializer.save()
        return Response(
            ConversationSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    operation_id='conversation_detail',
    summary='Get conversation details',
    description='Get conversation details with last message',
    tags=['Chat']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_detail(request, conversation_id):
    """Get conversation details"""
    conversation = get_object_or_404(
        Conversation.objects.prefetch_related(
            Prefetch('participants', queryset=Participant.objects.select_related('user')),
            Prefetch('messages', queryset=Message.objects.select_related('sender').order_by('-created_at')[:1])
        ),
        id=conversation_id,
        participants__user=request.user
    )
    
    serializer = ConversationSerializer(conversation, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    operation_id='conversation_messages',
    summary='Get conversation messages',
    description='Get messages for a conversation with pagination',
    tags=['Chat']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_messages(request, conversation_id):
    """Get messages for a conversation"""
    conversation = get_object_or_404(
        Conversation,
        id=conversation_id,
        participants__user=request.user
    )
    
    # Get messages with pagination
    limit = min(int(request.query_params.get('limit', 50)), 100)
    offset = int(request.query_params.get('offset', 0))
    
    messages = Message.objects.filter(
        conversation=conversation
    ).select_related('sender').order_by('created_at')[offset:offset+limit]
    
    serializer = MessageSerializer(messages, many=True, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    operation_id='user_response',
    summary='Submit user message',
    description='Submit a user message and receive conversation_id',
    tags=['Chat']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_response(request):
    """Submit user message and get conversation_id"""
    serializer = UserResponseSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    message_text = data['message']
    conversation_id = data.get('conversation_id')
    
    # Get or create conversation
    if conversation_id:
        conversation = get_object_or_404(
            Conversation,
            id=conversation_id,
            participants__user=request.user
        )
    else:
        # Create new conversation
        conversation = Conversation.objects.create(
            created_by=request.user,
            title=f"Chat with {request.user.username}"
        )
        Participant.objects.create(
            conversation=conversation,
            user=request.user,
            role='owner'
        )
    
    # Create user message
    user_message = Message.objects.create(
        conversation=conversation,
        sender=request.user,
        type='user',
        text=message_text,
        status='sent'
    )
    
    # Update conversation timestamp
    conversation.save(update_fields=['updated_at'])
    
    return Response({
        'conversation_id': str(conversation.id),
        'message_id': str(user_message.id)
    }, status=status.HTTP_201_CREATED)


@extend_schema(
    operation_id='bot_response',
    summary='Get bot response',
    description='Get bot response for a conversation',
    tags=['Chat']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bot_response(request):
    """Get bot response for conversation"""
    serializer = BotResponseSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    conversation_id = serializer.validated_data['conversation_id']
    conversation = get_object_or_404(
        Conversation,
        id=conversation_id,
        participants__user=request.user
    )
    
    # Get the last user message
    last_user_message = Message.objects.filter(
        conversation=conversation,
        type='user'
    ).order_by('-created_at').first()
    
    if not last_user_message:
        return Response(
            {'error': 'No user message found in conversation'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate bot reply
    try:
        bot_reply_text = generate_reply(conversation, last_user_message)
        
        # Create bot message
        bot_message = Message.objects.create(
            conversation=conversation,
            sender=None,  # Bot messages have no sender
            type='bot',
            text=bot_reply_text,
            status='sent'
        )
        
        # Update conversation timestamp
        conversation.save(update_fields=['updated_at'])
        
        return Response({
            'message': bot_reply_text
        })
        
    except Exception as e:
        return Response(
            {'error': 'Failed to generate bot response'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(
    operation_id='bot_prompts',
    summary='Get bot prompts',
    description='Get quick-start prompts for the bot',
    tags=['Chat']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bot_prompts(request):
    """Get bot prompts"""
    prompts = Prompt.objects.filter(is_active=True).order_by('order', 'title')
    serializer = PromptSerializer(prompts, many=True)
    return Response(serializer.data)


@extend_schema(
    operation_id='message_read',
    summary='Mark message as read',
    description='Mark messages as read and update participant last_read_at',
    tags=['Chat']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def message_read(request, message_id):
    """Mark message as read"""
    message = get_object_or_404(
        Message,
        id=message_id,
        conversation__participants__user=request.user
    )
    
    # Mark message as read for this user
    message.mark_as_read(request.user)
    
    return Response({'status': 'success'})


@extend_schema(
    operation_id='typing_indicator',
    summary='Send typing indicator',
    description='Send typing indicator (ephemeral, no DB storage)',
    tags=['Chat']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def typing_indicator(request):
    """Send typing indicator"""
    serializer = TypingSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # This is handled by WebSocket consumers
    # HTTP endpoint is just for validation
    return Response({'status': 'success'})


@extend_schema(
    operation_id='upload_attachment',
    summary='Upload attachment',
    description='Upload file attachment for chat messages',
    tags=['Chat']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_attachment(request):
    """Upload attachment for chat messages"""
    if 'file' not in request.FILES:
        return Response(
            {'error': 'No file provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    file = request.FILES['file']
    
    # Check file size
    max_size = 10 * 1024 * 1024  # 10MB
    if file.size > max_size:
        return Response(
            {'error': 'File size cannot exceed 10MB'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    if file.content_type not in allowed_types:
        return Response(
            {'error': 'File type not allowed. Only images and PDFs are supported.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create a temporary message with attachment
    temp_message = Message.objects.create(
        conversation=None,  # Will be set when message is actually sent
        sender=request.user,
        type='user',
        text='',  # Will be set when message is sent
        attachment=file,
        status='sent'
    )
    
    return Response({
        'attachment_id': str(temp_message.id),
        'file_url': request.build_absolute_uri(temp_message.attachment.url),
        'file_name': file.name,
        'file_size': file.size
    })