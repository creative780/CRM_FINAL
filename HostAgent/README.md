Host Agent — Local Device Name Helper
====================================

Why
---
Browsers cannot read your OS computer name for security reasons. This tiny
local agent exposes the Windows/macOS/Linux hostname on 127.0.0.1 so the
frontend can fetch it and send it to the backend automatically.

What it does
------------
- Starts HTTP on 127.0.0.1:47113
- GET /hostname -> { "deviceName": "<your-hostname>" }
- CORS enabled for local development

How to run (Windows)
--------------------
1) Double-click `start.bat` or run from a terminal:

   node HostAgent/server.js

2) You should see:

   [host-agent] listening at http://127.0.0.1:47113/hostname

3) Open the Attendance page; it will automatically fetch your device name
   and display it. Check-ins will store this as `device_name` in the backend.

Optional (auto-start)
---------------------
- Use Task Scheduler to run `node <path>/HostAgent/server.js` at user logon.

Notes
-----
- No external dependencies; requires Node.js only.
- Listens on loopback (127.0.0.1) only.
