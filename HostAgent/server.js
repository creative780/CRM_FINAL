// Lightweight local hostname agent (no external deps)
// Runs a tiny HTTP server on 127.0.0.1:47113 and returns { deviceName }
// Also serves device ID from the monitoring agent config
// Usage: node server.js

const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

const PORT = 47113;
const HOST = '127.0.0.1';

function send(res, status, bodyObj) {
  const body = JSON.stringify(bodyObj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    // Allow frontend (localhost:3000) to fetch
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function getDeviceId() {
  try {
    // Read device ID from agent config file
    const configPath = path.join(os.homedir(), '.creative_connect_agent_config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.device_id || null;
    }
  } catch (error) {
    console.error('Error reading device ID:', error.message);
  }
  return null;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    // Preflight
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  if (req.url === '/hostname' && req.method === 'GET') {
    const name = os.hostname();
    return send(res, 200, { deviceName: name });
  }

  if (req.url === '/device-id' && req.method === 'GET') {
    const deviceId = getDeviceId();
    if (deviceId) {
      return send(res, 200, { 
        device_id: deviceId, 
        status: 'active',
        hostname: os.hostname()
      });
    } else {
      return send(res, 404, { error: 'Device ID not found' });
    }
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[host-agent] listening at http://${HOST}:${PORT}/hostname`);
  console.log(`[host-agent] device-id endpoint: http://${HOST}:${PORT}/device-id`);
});

