# CRM Backend (Django 5 + DRF)

Quick start

1. Create venv and install deps
   - Windows PowerShell:
     - `py -m venv .venv`
     - `./.venv/Scripts/python -m pip install -U pip`
     - `./.venv/Scripts/python -m pip install -r requirements.txt`
2. Environment
   - Copy `.env.example` to `.env` and edit as needed
3. Migrate & seed
   - `./.venv/Scripts/python Backend/manage.py migrate`
   - `./.venv/Scripts/python Backend/manage.py seed_demo`
4. Run
   - `./.venv/Scripts/python Backend/manage.py runserver 0.0.0.0:8000`

Core endpoints

- Auth:
  - POST /api/auth/login
  - POST /api/auth/register (admin)
  - GET /api/auth/me
- Monitoring:
  - GET /api/employees
  - POST /api/track
  - POST /api/screenshot
  - POST /api/screenshot/delete
- Orders:
  - POST /api/orders
  - PATCH /api/orders/{id}
  - POST /api/orders/{id}/actions/mark-printed
  - POST /api/decrement-inventory (legacy)
- Delivery:
  - POST /api/delivery/send-code
  - POST /api/send-delivery-code (legacy)
  - POST /api/delivery/rider-photo
  - POST /api/upload-rider-photo (legacy)
- Inventory:
  - GET /api/inventory/items
  - POST /api/inventory/adjust (admin)
- HR:
  - GET /api/hr/employees
  - POST /api/hr/salary-slips

Docs

- OpenAPI schema: /api/schema/
- Swagger UI: /api/docs/
- Health: /healthz

Activity Logs Service

- App: `activity_log`
- Endpoints:
  - POST `/api/activity-logs/ingest` (HMAC)
  - GET `/api/activity-logs/` (cursor pagination; JWT)
  - GET `/api/activity-logs/{id}` (JWT)
  - POST `/api/activity-logs/export` (JWT, async)
  - GET `/api/activity-logs/exports/{job_id}` (JWT)
  - GET `/api/activity-logs/metrics` (JWT)

Docker Compose (web, db, redis, celery, celery-beat)

```
docker compose -f Backend/docker-compose.yml up --build
```

Environment

- `DJANGO_SECRET_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ALLOWED_ORIGINS`

SDK

- Python client at `Backend/activity_log/clients/python/activity_logs_client.py`

Chat Service

- App: `chat`
- Real-time chat with WebSocket support and HTTP fallbacks
- Bot integration with pluggable LLM providers
- Endpoints:
  - POST `/api/user-response/` (submit user message, get conversation_id)
  - POST `/api/bot-response/` (get bot response for conversation)
  - GET `/api/bot-prompts/` (quick-start prompts)
  - GET `/api/chat/conversations/` (list user conversations)
  - POST `/api/chat/conversations/` (create conversation)
  - GET `/api/chat/conversations/{id}/` (conversation details)
  - GET `/api/chat/conversations/{id}/messages/` (paginated messages)
  - POST `/api/chat/messages/{id}/read/` (mark as read)
  - POST `/api/chat/upload/` (file attachments)
- WebSocket: `ws://host/ws/chat/{conversation_id}/?token={jwt}`
- Events: `message:new`, `typing`, `read`, `user_joined`, `user_left`
- Features: typing indicators, read receipts, attachments, markdown rendering
- Bot service: Echo bot (default), OpenAI/Groq integration ready
- Frontend: Enhanced ChatBot component with real-time features