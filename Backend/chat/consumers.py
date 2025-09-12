import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import ChatRoom, ChatMessage

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        
        # Check if user is member of the room
        if await self.is_room_member():
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        
        if message_type == 'chat_message':
            message_content = text_data_json.get('message', '')
            await self.save_and_send_message(message_content)

    async def save_and_send_message(self, content):
        # Save message to database
        message = await self.save_message(content)
        
        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id': message['id'],
                    'content': message['content'],
                    'sender': message['sender'],
                    'sender_name': message['sender_name'],
                    'created_at': message['created_at'],
                    'message_type': message['message_type']
                }
            }
        )

    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message']
        }))

    @database_sync_to_async
    def is_room_member(self):
        try:
            room = ChatRoom.objects.get(id=self.room_id, is_active=True)
            return room.members.filter(id=self.scope['user'].id).exists()
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, content):
        try:
            room = ChatRoom.objects.get(id=self.room_id, is_active=True)
            message = ChatMessage.objects.create(
                room=room,
                sender=self.scope['user'],
                content=content,
                message_type='text'
            )
            
            # Update room's updated_at timestamp
            room.save(update_fields=['updated_at'])
            
            return {
                'id': message.id,
                'content': message.content,
                'sender': message.sender.id,
                'sender_name': message.sender.username,
                'created_at': message.created_at.isoformat(),
                'message_type': message.message_type
            }
        except ChatRoom.DoesNotExist:
            return None
