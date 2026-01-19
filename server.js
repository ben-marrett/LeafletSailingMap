const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const pool = require('./db');
const routes = require('./routes');
const auth = require('./auth');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

// AIS WebSocket proxy
const AIS_API_KEY = process.env.AIS_API_KEY;
const AIS_SOCKET_URL = "wss://stream.aisstream.io/v0/stream";

if (!AIS_API_KEY) {
    console.warn('WARNING: AIS_API_KEY not set - ship tracking will not work');
}

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    if (!AIS_API_KEY) {
        ws.close(1008, 'AIS API key not configured');
        return;
    }

    const aisSocket = new WebSocket(AIS_SOCKET_URL);
    let pingInterval;

    aisSocket.on('open', () => {
        console.log('Connected to aisstream.io');
        const subscriptionMessage = {
            APIKey: AIS_API_KEY,
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
        console.log('Client disconnected');
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

app.use(bodyParser.json());

// Session middleware with PostgreSQL store
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'sailing-map-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Mount routes
app.use('/api/auth', auth);
app.use('/api', routes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}`);
});
