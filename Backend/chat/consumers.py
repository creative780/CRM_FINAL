import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .models import Conversation, Participant, Message

User = get_user_model()
logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time chat features"""
    
    async def connect(self):
        """Connect to WebSocket"""
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.conversation_group_name = f'chat_{self.conversation_id}'
        
        # Authenticate user
        self.user = await self.authenticate_user()
        if not self.user or isinstance(self.user, AnonymousUser):
            await self.close()
            return
        
        # Check if user is participant in conversation
        if not await self.is_participant():
            await self.close()
            return
        
        # Join conversation group
        await self.channel_layer.group_add(
            self.conversation_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send user joined event
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'user_joined',
                'user_id': str(self.user.id),
                'username': self.user.username,
            }
        )
    
    async def disconnect(self, close_code):
        """Disconnect from WebSocket"""
        if hasattr(self, 'conversation_group_name'):
            # Send user left event
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    'type': 'user_left',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                }
            )
            
            # Leave conversation group
            await self.channel_layer.group_discard(
                self.conversation_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Receive message from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'message':
                await self.handle_message(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
            elif message_type == 'read':
                await self.handle_read_receipt(data)
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Unknown message type'
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
        except Exception as e:
            logger.error(f"Error in receive: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))
    
    async def handle_message(self, data):
        """Handle new message"""
        text = data.get('text', '').strip()
        if not text:
            return
        
        # Create message in database
        message = await self.create_message(text)
        
        # Send message to group
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'message_new',
                'message': {
                    'id': str(message.id),
                    'conversation_id': str(message.conversation.id),
                    'type': message.type,
                    'text': message.text,
                    'sender': message.sender.username if message.sender else None,
                    'sender_name': f"{message.sender.first_name} {message.sender.last_name}".strip() if message.sender else "System",
                    'created_at': message.created_at.isoformat(),
                    'attachment': message.attachment.url if message.attachment else None,
                }
            }
        )
    
    async def handle_typing(self, data):
        """Handle typing indicator"""
        is_typing = data.get('is_typing', False)
        
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'typing',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'is_typing': is_typing,
            }
        )
    
    async def handle_read_receipt(self, data):
        """Handle read receipt"""
        message_ids = data.get('message_ids', [])
        if not message_ids:
            return
        
        # Mark messages as read
        await self.mark_messages_read(message_ids)
        
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'read_receipt',
                'message_ids': message_ids,
                'user_id': str(self.user.id),
                'username': self.user.username,
            }
        )
    
    # WebSocket event handlers
    async def message_new(self, event):
        """Send new message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'message:new',
            'message': event['message']
        }))
    
    async def message_ack(self, event):
        """Send message acknowledgment to sender"""
        if str(self.user.id) == event['sender_id']:
            await self.send(text_data=json.dumps({
                'type': 'message:ack',
                'message_id': event['message_id'],
                'status': event['status']
            }))
    
    async def typing(self, event):
        """Send typing indicator"""
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_typing': event['is_typing']
        }))
    
    async def read_receipt(self, event):
        """Send read receipt"""
        await self.send(text_data=json.dumps({
            'type': 'read',
            'message_ids': event['message_ids'],
            'user_id': event['user_id'],
            'username': event['username']
        }))
    
    async def user_joined(self, event):
        """Send user joined notification"""
        if str(self.user.id) != event['user_id']:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user_id': event['user_id'],
                'username': event['username']
            }))
    
    async def user_left(self, event):
        """Send user left notification"""
        if str(self.user.id) != event['user_id']:
            await self.send(text_data=json.dumps({
                'type': 'user_left',
                'user_id': event['user_id'],
                'username': event['username']
            }))
    
    # Database operations
    @database_sync_to_async
    def authenticate_user(self):
        """Authenticate user from JWT token"""
        try:
            # Get token from query params or headers
            token = None
            
            # Try query params first
            if 'token' in self.scope['query_string'].decode():
                token = self.scope['query_string'].decode().split('token=')[1].split('&')[0]
            
            # Try Authorization header
            if not token:
                headers = dict(self.scope['headers'])
                auth_header = headers.get(b'authorization', b'').decode()
                if auth_header.startswith('Bearer '):
                    token = auth_header[7:]
            
            if not token:
                return AnonymousUser()
            
            # Validate token
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
            
        except (InvalidToken, TokenError, User.DoesNotExist):
            return AnonymousUser()
    
    @database_sync_to_async
    def is_participant(self):
        """Check if user is participant in conversation"""
        try:
            return Participant.objects.filter(
                conversation_id=self.conversation_id,
                user=self.user
            ).exists()
        except Exception:
            return False
    
    @database_sync_to_async
    def create_message(self, text):
        """Create message in database"""
        conversation = Conversation.objects.get(id=self.conversation_id)
        message = Message.objects.create(
            conversation=conversation,
            sender=self.user,
            type='user',
            text=text,
            status='sent'
        )
        # Update conversation timestamp
        conversation.save(update_fields=['updated_at'])
        return message
    
    @database_sync_to_async
    def mark_messages_read(self, message_ids):
        """Mark messages as read"""
        try:
            messages = Message.objects.filter(
                id__in=message_ids,
                conversation_id=self.conversation_id
            )
            for message in messages:
                message.mark_as_read(self.user)
        except Exception as e:
            logger.error(f"Error marking messages as read: {e}")