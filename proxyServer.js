const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const API_KEY = process.env.AIS_API_KEY;
const socketUrl = "wss://stream.aisstream.io/v0/stream";

if (!API_KEY) {
    console.error('ERROR: AIS_API_KEY not set in .env file');
    process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.static('public')); // Serve your static files if needed

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Debug route to test if server is running
app.get('/status', (req, res) => {
  res.json({ status: 'Proxy server running' });
});

wss.on('connection', (ws) => {
  console.log('Client connected to proxy server');

  const aisSocket = new WebSocket(socketUrl);
  let pingInterval;

  aisSocket.on('open', () => {
    console.log('Connected to aisstream.io');
    const subscriptionMessage = {
      APIKey: API_KEY,
      BoundingBoxes: [
        [
          [-47.0, 166.0],
          [-34.0, 179.0],
        ],
      ],
      FilterMessageTypes: ["PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport"]
    };
    aisSocket.send(JSON.stringify(subscriptionMessage));

    // Keep connection alive with ping every 30 seconds
    pingInterval = setInterval(() => {
      if (aisSocket.readyState === WebSocket.OPEN) {
        aisSocket.ping();
      }
    }, 30000);
  });
  
  aisSocket.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    const posReport = msg.Message?.PositionReport || msg.Message?.StandardClassBPositionReport || msg.Message?.ExtendedClassBPositionReport;
    if (posReport) {
      const mmsi = posReport.UserID;
      console.log('Received:', msg.MessageType, 'MMSI:', mmsi, mmsi === 512120000 ? '<<< RTT!' : '');
    }
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data.toString());
    }
  });
  
  aisSocket.on('close', () => {
    console.log('Disconnected from aisstream.io');
    clearInterval(pingInterval);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });
  
  aisSocket.on('error', (error) => {
    console.error('AIS WebSocket error:', error);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected from proxy server');
    clearInterval(pingInterval);
    if (aisSocket.readyState === WebSocket.OPEN) {
      aisSocket.close();
    }
  });
  
  ws.on('error', (error) => {
    console.error('Client WebSocket error:', error);
    if (aisSocket.readyState === WebSocket.OPEN) {
      aisSocket.close();
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Proxy server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server is available at ws://localhost:${PORT}`);
});