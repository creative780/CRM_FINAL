"""
WebSocket consumers for real-time monitoring updates
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Device, Heartbeat, Screenshot
from .auth_utils import verify_jwt_token

logger = logging.getLogger(__name__)


class MonitoringConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time monitoring updates"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        # Get token from query parameters
        token = self.scope['query_string'].decode().split('token=')[1] if 'token=' in self.scope['query_string'].decode() else None
        
        if not token:
            await self.close(code=4001)
            return
        
        # Verify JWT token
        try:
            user = await self.verify_token(token)
            if not user:
                await self.close(code=4001)
                return
            
            # Check if user is admin
            if not user.is_staff:
                await self.close(code=4003)
                return
                
            self.user = user
            self.room_group_name = 'monitoring_updates'
            
            # Join monitoring group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            logger.info(f"Monitoring WebSocket connected for user: {user.email}")
            
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            await self.close(code=4000)
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        logger.info(f"Monitoring WebSocket disconnected: {close_code}")
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
            elif message_type == 'subscribe_device':
                device_id = data.get('device_id')
                if device_id:
                    device_group = f'device_{device_id}'
                    await self.channel_layer.group_add(
                        device_group,
                        self.channel_name
                    )
                    await self.send(text_data=json.dumps({
                        'type': 'subscribed',
                        'device_id': device_id
                    }))
            elif message_type == 'unsubscribe_device':
                device_id = data.get('device_id')
                if device_id:
                    device_group = f'device_{device_id}'
                    await self.channel_layer.group_discard(
                        device_group,
                        self.channel_name
                    )
                    
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
        except Exception as e:
            logger.error(f"WebSocket receive error: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal error'
            }))
    
    async def device_update(self, event):
        """Handle device update events"""
        await self.send(text_data=json.dumps({
            'type': 'device_update',
            'device': event['device']
        }))
    
    async def heartbeat_update(self, event):
        """Handle heartbeat update events"""
        await self.send(text_data=json.dumps({
            'type': 'heartbeat_update',
            'device_id': event['device_id'],
            'heartbeat': event['heartbeat']
        }))
    
    async def screenshot_update(self, event):
        """Handle screenshot update events"""
        await self.send(text_data=json.dumps({
            'type': 'screenshot_update',
            'device_id': event['device_id'],
            'screenshot': event['screenshot']
        }))
    
    async def device_status_change(self, event):
        """Handle device status change events"""
        await self.send(text_data=json.dumps({
            'type': 'device_status_change',
            'device_id': event['device_id'],
            'status': event['status'],
            'timestamp': event['timestamp']
        }))
    
    @database_sync_to_async
    def verify_token(self, token):
        """Verify JWT token and return user"""
        try:
            return verify_jwt_token(token)
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None


class DeviceConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for individual device monitoring"""
    
    async def connect(self):
        """Handle WebSocket connection for device monitoring"""
        self.device_id = self.scope['url_route']['kwargs']['device_id']
        self.room_group_name = f'device_{self.device_id}'
        
        # Get token from query parameters
        token = self.scope['query_string'].decode().split('token=')[1] if 'token=' in self.scope['query_string'].decode() else None
        
        if not token:
            await self.close(code=4001)
            return
        
        # Verify JWT token and admin access
        try:
            user = await self.verify_token(token)
            if not user or not user.is_staff:
                await self.close(code=4003)
                return
                
            # Check if device exists
            device = await self.get_device(self.device_id)
            if not device:
                await self.close(code=4004)
                return
            
            self.user = user
            self.device = device
            
            # Join device group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            logger.info(f"Device WebSocket connected for device: {self.device_id}")
            
        except Exception as e:
            logger.error(f"Device WebSocket connection error: {e}")
            await self.close(code=4000)
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        logger.info(f"Device WebSocket disconnected: {close_code}")
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
            elif message_type == 'get_latest_data':
                # Send latest device data
                latest_data = await self.get_latest_device_data()
                await self.send(text_data=json.dumps({
                    'type': 'latest_data',
                    'data': latest_data
                }))
                    
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
        except Exception as e:
            logger.error(f"Device WebSocket receive error: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal error'
            }))
    
    async def device_heartbeat(self, event):
        """Handle device heartbeat events"""
        await self.send(text_data=json.dumps({
            'type': 'heartbeat',
            'heartbeat': event['heartbeat']
        }))
    
    async def device_screenshot(self, event):
        """Handle device screenshot events"""
        await self.send(text_data=json.dumps({
            'type': 'screenshot',
            'screenshot': event['screenshot']
        }))
    
    async def device_activity(self, event):
        """Handle device activity events"""
        await self.send(text_data=json.dumps({
            'type': 'activity',
            'activity': event['activity']
        }))
    
    @database_sync_to_async
    def verify_token(self, token):
        """Verify JWT token and return user"""
        try:
            return verify_jwt_token(token)
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    @database_sync_to_async
    def get_device(self, device_id):
        """Get device by ID"""
        try:
            return Device.objects.get(id=device_id)
        except Device.DoesNotExist:
            return None
    
    @database_sync_to_async
    def get_latest_device_data(self):
        """Get latest device data including heartbeat and screenshot"""
        try:
            device = Device.objects.select_related('current_user').get(id=self.device_id)
            latest_heartbeat = device.heartbeats.order_by('-created_at').first()
            latest_screenshot = device.screenshots.order_by('-taken_at').first()
            
            data = {
                'device': {
                    'id': device.id,
                    'hostname': device.hostname,
                    'os': device.os,
                    'status': device.status,
                    'ip': device.ip,
                    'enrolled_at': device.enrolled_at.isoformat(),
                    'last_heartbeat': device.last_heartbeat.isoformat() if device.last_heartbeat else None,
                },
                'current_user': {
                    'id': device.current_user.id if device.current_user else None,
                    'email': device.current_user.email if device.current_user else None,
                    'name': device.current_user_name or '',
                    'role': device.current_user_role or '',
                } if device.current_user else None,
                'latest_heartbeat': {
                    'cpu_percent': latest_heartbeat.cpu_percent,
                    'mem_percent': latest_heartbeat.mem_percent,
                    'active_window': latest_heartbeat.active_window,
                    'is_locked': latest_heartbeat.is_locked,
                    'created_at': latest_heartbeat.created_at.isoformat(),
                    'keystroke_count': latest_heartbeat.keystroke_count,
                    'mouse_click_count': latest_heartbeat.mouse_click_count,
                    'productivity_score': latest_heartbeat.productivity_score,
                } if latest_heartbeat else None,
                'latest_screenshot': {
                    'thumb_url': latest_screenshot.thumb_url if latest_screenshot else None,
                    'taken_at': latest_screenshot.taken_at.isoformat() if latest_screenshot else None,
                } if latest_screenshot else None,
            }
            return data
        except Exception as e:
            logger.error(f"Error getting latest device data: {e}")
            return None

