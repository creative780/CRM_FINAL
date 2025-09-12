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
