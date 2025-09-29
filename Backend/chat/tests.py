from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken
from .models import Conversation, Participant, Message, Prompt
from .services.bot import EchoBotService, generate_reply

User = get_user_model()


class ChatModelsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.conversation = Conversation.objects.create(
            created_by=self.user,
            title='Test Conversation'
        )
        self.participant = Participant.objects.create(
            conversation=self.conversation,
            user=self.user,
            role='owner'
        )

    def test_conversation_creation(self):
        """Test conversation creation"""
        self.assertEqual(self.conversation.created_by, self.user)
        self.assertEqual(self.conversation.title, 'Test Conversation')
        self.assertFalse(self.conversation.is_archived)

    def test_participant_creation(self):
        """Test participant creation"""
        self.assertEqual(self.participant.conversation, self.conversation)
        self.assertEqual(self.participant.user, self.user)
        self.assertEqual(self.participant.role, 'owner')

    def test_message_creation(self):
        """Test message creation"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user,
            type='user',
            text='Hello, world!',
            status='sent'
        )
        
        self.assertEqual(message.conversation, self.conversation)
        self.assertEqual(message.sender, self.user)
        self.assertEqual(message.type, 'user')
        self.assertEqual(message.text, 'Hello, world!')
        self.assertEqual(message.status, 'sent')

    def test_message_ordering(self):
        """Test message ordering"""
        msg1 = Message.objects.create(
            conversation=self.conversation,
            sender=self.user,
            type='user',
            text='First message',
            status='sent'
        )
        msg2 = Message.objects.create(
            conversation=self.conversation,
            sender=self.user,
            type='user',
            text='Second message',
            status='sent'
        )
        
        messages = Message.objects.filter(conversation=self.conversation)
        self.assertEqual(list(messages), [msg1, msg2])

    def test_message_mark_as_read(self):
        """Test marking message as read"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user,
            type='user',
            text='Test message',
            status='sent'
        )
        
        message.mark_as_read(self.user)
        
        participant = Participant.objects.get(
            conversation=self.conversation,
            user=self.user
        )
        self.assertIsNotNone(participant.last_read_at)


class ChatAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.token = AccessToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        
        # Create sample prompts
        self.prompt1 = Prompt.objects.create(
            title='Test Prompt 1',
            text='This is a test prompt',
            order=1
        )
        self.prompt2 = Prompt.objects.create(
            title='Test Prompt 2',
            text='This is another test prompt',
            order=2
        )

    def test_user_response_endpoint(self):
        """Test user response endpoint"""
        url = reverse('user-response')
        data = {'message': 'Hello, bot!'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('conversation_id', response.data)
        self.assertIn('message_id', response.data)
        
        # Check that conversation was created
        conversation_id = response.data['conversation_id']
        conversation = Conversation.objects.get(id=conversation_id)
        self.assertEqual(conversation.created_by, self.user)
        
        # Check that message was created
        message_id = response.data['message_id']
        message = Message.objects.get(id=message_id)
        self.assertEqual(message.text, 'Hello, bot!')
        self.assertEqual(message.type, 'user')
        self.assertEqual(message.sender, self.user)

    def test_bot_response_endpoint(self):
        """Test bot response endpoint"""
        # First create a conversation with a user message
        conversation = Conversation.objects.create(
            created_by=self.user,
            title='Test Chat'
        )
        Participant.objects.create(
            conversation=conversation,
            user=self.user,
            role='owner'
        )
        Message.objects.create(
            conversation=conversation,
            sender=self.user,
            type='user',
            text='Hello, bot!',
            status='sent'
        )
        
        url = reverse('bot-response')
        data = {'conversation_id': str(conversation.id)}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        
        # Check that bot message was created
        bot_messages = Message.objects.filter(
            conversation=conversation,
            type='bot'
        )
        self.assertEqual(bot_messages.count(), 1)
        
        bot_message = bot_messages.first()
        self.assertEqual(bot_message.text, response.data['message'])

    def test_bot_prompts_endpoint(self):
        """Test bot prompts endpoint"""
        url = reverse('bot-prompts')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        # Check that prompts are ordered correctly
        self.assertEqual(response.data[0]['title'], 'Test Prompt 1')
        self.assertEqual(response.data[1]['title'], 'Test Prompt 2')

    def test_conversations_list_endpoint(self):
        """Test conversations list endpoint"""
        # Create a conversation
        conversation = Conversation.objects.create(
            created_by=self.user,
            title='Test Chat'
        )
        Participant.objects.create(
            conversation=conversation,
            user=self.user,
            role='owner'
        )
        
        url = reverse('conversations-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Test Chat')

    def test_conversation_messages_endpoint(self):
        """Test conversation messages endpoint"""
        # Create a conversation with messages
        conversation = Conversation.objects.create(
            created_by=self.user,
            title='Test Chat'
        )
        Participant.objects.create(
            conversation=conversation,
            user=self.user,
            role='owner'
        )
        
        Message.objects.create(
            conversation=conversation,
            sender=self.user,
            type='user',
            text='Hello!',
            status='sent'
        )
        Message.objects.create(
            conversation=conversation,
            sender=None,
            type='bot',
            text='Hi there!',
            status='sent'
        )
        
        url = reverse('conversation-messages', kwargs={'conversation_id': conversation.id})
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['text'], 'Hello!')
        self.assertEqual(response.data[1]['text'], 'Hi there!')

    def test_unauthorized_access(self):
        """Test that unauthorized users cannot access endpoints"""
        self.client.credentials()  # Remove authentication
        
        url = reverse('user-response')
        data = {'message': 'Hello, bot!'}
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class BotServiceTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.conversation = Conversation.objects.create(
            created_by=self.user,
            title='Test Conversation'
        )
        self.participant = Participant.objects.create(
            conversation=self.conversation,
            user=self.user,
            role='owner'
        )

    def test_echo_bot_service(self):
        """Test echo bot service responses"""
        bot_service = EchoBotService()
        
        # Test greeting
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user,
            type='user',
            text='Hello',
            status='sent'
        )
        
        response = bot_service.generate_reply(self.conversation, message)
        self.assertIn('Hello!', response)
        self.assertIn('CRM', response)
        
        # Test help request
        message.text = 'I need help'
        response = bot_service.generate_reply(self.conversation, message)
        self.assertIn('help', response.lower())
        
        # Test order request
        message.text = 'I want to place an order'
        response = bot_service.generate_reply(self.conversation, message)
        self.assertIn('order', response.lower())

    def test_generate_reply_function(self):
        """Test the generate_reply utility function"""
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user,
            type='user',
            text='Hello',
            status='sent'
        )
        
        response = generate_reply(self.conversation, message)
        self.assertIsInstance(response, str)
        self.assertGreater(len(response), 0)
