# Chat System Testing Guide

## Overview
This guide covers testing the production-ready, real-time chat feature in the CRM monorepo.

## Backend Testing

### Unit Tests
```bash
cd Backend
python manage.py test chat
```

### API Testing with Postman
1. Import the collection: `Backend/chat/ChatAPI.postman_collection.json`
2. Set up authentication:
   - Get JWT token from `/api/auth/login`
   - Set `jwt_token` variable in Postman
3. Test endpoints in order:
   - Submit User Message → Get `conversation_id`
   - Get Bot Response
   - Get Bot Prompts
   - List Conversations
   - Get Messages

### Manual API Testing
```bash
# Get JWT token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'

# Submit user message
curl -X POST http://localhost:8000/api/user-response/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, bot!"}'

# Get bot response
curl -X POST http://localhost:8000/api/bot-response/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversation_id": "CONVERSATION_ID"}'
```

## WebSocket Testing

### Using wscat (Node.js)
```bash
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://localhost:8000/ws/chat/CONVERSATION_ID/?token=YOUR_JWT_TOKEN"

# Send message
{"type": "message", "text": "Hello via WebSocket"}

# Send typing indicator
{"type": "typing", "is_typing": true}

# Mark messages as read
{"type": "read", "message_ids": ["MESSAGE_ID"]}
```

### Using Python WebSocket Client
```python
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws/chat/CONVERSATION_ID/?token=YOUR_JWT_TOKEN"
    
    async with websockets.connect(uri) as websocket:
        # Send message
        await websocket.send(json.dumps({
            "type": "message",
            "text": "Hello from Python!"
        }))
        
        # Listen for responses
        async for message in websocket:
            data = json.loads(message)
            print(f"Received: {data}")

asyncio.run(test_websocket())
```

## Frontend Testing

### Test Page
1. Navigate to `/chat-test` in your browser
2. Open the chat panel (bottom-right FAB)
3. Test features:
   - Send messages
   - Use quick prompts
   - Check WebSocket connection status
   - Test typing indicators
   - Verify message rendering

### Component Integration
```tsx
import { EnhancedChatBot } from "@/app/components/EnhancedChatBot";

export default function MyPage() {
  return (
    <div>
      <EnhancedChatBot
        botName="My Bot"
        position="bottom-right"
        onConversationChange={(id) => console.log('New conversation:', id)}
      />
    </div>
  );
}
```

## End-to-End Testing Scenarios

### Scenario 1: Basic Chat Flow
1. **Setup**: Start backend and frontend
2. **Login**: Authenticate user
3. **Open Chat**: Click chat FAB
4. **Send Message**: Type "Hello" and send
5. **Verify**: Bot responds with greeting
6. **Check**: Message appears in conversation list

### Scenario 2: Real-time Features
1. **Open Two Tabs**: Same user, same conversation
2. **Send Message**: From tab 1
3. **Verify**: Message appears instantly in tab 2
4. **Type**: Start typing in tab 1
5. **Verify**: Typing indicator shows in tab 2

### Scenario 3: WebSocket Fallback
1. **Disable WebSocket**: Block WebSocket connections
2. **Send Message**: Should fall back to HTTP
3. **Verify**: Bot still responds correctly
4. **Re-enable**: WebSocket should reconnect automatically

### Scenario 4: File Upload
1. **Prepare**: Create test image/PDF file
2. **Upload**: Use attachment upload endpoint
3. **Send**: Include attachment in message
4. **Verify**: File appears in chat

## Performance Testing

### Load Testing with Artillery
```yaml
# artillery-config.yml
config:
  target: 'http://localhost:8000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Chat API Load Test"
    weight: 100
    flow:
      - post:
          url: "/api/user-response/"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            message: "Load test message {{ $randomString() }}"
```

```bash
artillery run artillery-config.yml
```

### WebSocket Load Testing
```javascript
// websocket-load-test.js
const WebSocket = require('ws');

const connections = [];
const numConnections = 100;

for (let i = 0; i < numConnections; i++) {
  const ws = new WebSocket('ws://localhost:8000/ws/chat/CONVERSATION_ID/?token=TOKEN');
  
  ws.on('open', () => {
    console.log(`Connection ${i} opened`);
    
    // Send message every 5 seconds
    setInterval(() => {
      ws.send(JSON.stringify({
        type: 'message',
        text: `Message from connection ${i}`
      }));
    }, 5000);
  });
  
  ws.on('message', (data) => {
    console.log(`Connection ${i} received:`, data.toString());
  });
  
  connections.push(ws);
}
```

## Monitoring and Debugging

### Backend Logs
```bash
# Django logs
tail -f logs/django.log

# Celery logs
celery -A crm_backend worker -l debug

# Redis logs
redis-cli monitor
```

### Frontend Debugging
```javascript
// Enable WebSocket debugging
localStorage.setItem('debug', 'websocket');

// Check connection status
console.log('WS Connected:', chatBot.isConnected());
console.log('Conversation ID:', chatBot.getConversationId());
```

### Database Queries
```sql
-- Check conversations
SELECT * FROM chat_conversation ORDER BY updated_at DESC LIMIT 10;

-- Check messages
SELECT c.title, m.text, m.type, m.created_at 
FROM chat_message m 
JOIN chat_conversation c ON m.conversation_id = c.id 
ORDER BY m.created_at DESC LIMIT 20;

-- Check participants
SELECT c.title, p.role, u.username, p.joined_at
FROM chat_participant p
JOIN chat_conversation c ON p.conversation_id = c.id
JOIN accounts_user u ON p.user_id = u.id;
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check JWT token validity
   - Verify Redis is running
   - Check CORS settings

2. **Messages Not Appearing**
   - Check database connection
   - Verify user permissions
   - Check conversation participation

3. **Bot Not Responding**
   - Check bot service configuration
   - Verify conversation has user messages
   - Check error logs

4. **File Upload Issues**
   - Check file size limits
   - Verify media directory permissions
   - Check file type restrictions

### Debug Commands
```bash
# Check Redis connection
redis-cli ping

# Check Celery workers
celery -A crm_backend inspect active

# Check Django channels
python manage.py shell
>>> from channels.layers import get_channel_layer
>>> channel_layer = get_channel_layer()
>>> print(channel_layer)
```

## Production Deployment Checklist

- [ ] Redis configured for production
- [ ] JWT tokens properly secured
- [ ] File upload limits configured
- [ ] CORS settings updated
- [ ] WebSocket proxy configured (nginx)
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit performed
