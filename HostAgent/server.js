// Lightweight local hostname agent (no external deps)
// Runs a tiny HTTP server on 127.0.0.1:47113 and returns { deviceName }
// Usage: node server.js

const http = require('http');
const os = require('os');

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

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[host-agent] listening at http://${HOST}:${PORT}/hostname`);
});

