from django.urls import path
from .views import chat_rooms_list, chat_rooms_create, chat_room_detail, chat_messages_list, chat_messages_create

urlpatterns = [
    path('chat/rooms/', chat_rooms_list, name='chat-rooms-list'),
    path('chat/rooms/', chat_rooms_create, name='chat-rooms-create'),
    path('chat/rooms/<int:room_id>/', chat_room_detail, name='chat-room-detail'),
    path('chat/rooms/<int:room_id>/messages/', chat_messages_list, name='chat-messages-list'),
    path('chat/rooms/<int:room_id>/messages/', chat_messages_create, name='chat-messages-create'),
]
