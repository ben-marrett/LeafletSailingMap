# Crow's Nest

Real-time ship tracking and route planning for New Zealand waters. Built with Leaflet.js, featuring live AIS ship tracking, weather popups, and R Tucker Thompson as the highlighted vessel.

## Quick Start

```bash
# Setup database
createdb sailing_map
psql sailing_map < db/init.sql
psql sailing_map < db/sample-routes.sql

# Install dependencies
npm install

# Start servers (two terminals)
npm start          # Port 8000 - main server
npm run proxy      # Port 3000 - AIS WebSocket proxy
```

## Architecture

### Servers
- **server.js** (Port 8000): Express server serving static files and API routes
- **proxyServer.js** (Port 3000): WebSocket proxy for AIS ship data from aisstream.io

### Key Files
| File | Purpose |
|------|---------|
| `server.js` | Main Express server with session/auth middleware |
| `proxyServer.js` | AIS WebSocket proxy server |
| `routes.js` | API routes for user routes and vessels |
| `auth.js` | Authentication routes (register, login, logout) |
| `db.js` | PostgreSQL connection pool |
| `public/index.html` | Main HTML with map container and UI |
| `public/scripts.js` | All client-side JavaScript (map, ships, routes, auth) |
| `public/styles.css` | CSS styling (old paper/nautical theme) |

### Database Tables
- `users` - User accounts
- `routes` - Per-user saved routes
- `tracked_vessels` - Per-user tracked vessels
- `ship_positions` - Historical ship positions
- `session` - Express session store

## Key Features

### Guest Experience (No Login Required)
- View map with all ships (auto-connects on page load)
- R Tucker Thompson (MMSI: 512120000) always highlighted with distinct icon
- Sample routes pre-loaded and visible
- Weather popups on location buttons
- Draw routes (temporary, not saved)
- View R Tucker Thompson track history (in-browser memory)

### Logged-in Experience
- All guest features plus:
- Save routes to database
- Track additional vessels (future)

## Featured Vessel
**R Tucker Thompson** - MMSI: 512120000
- Always highlighted with distinct icon
- Dedicated info panel showing speed/course
- Track history builds in browser memory
- "Locate on Map" and "Show Track" buttons

## Environment Variables (.env)

```
AIS_API_KEY=your_ais_api_key
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=sailing_map
DB_PASSWORD=your_db_password
DB_PORT=5432
SESSION_SECRET=random_32_char_string
```

## Cost Protection
- 15-minute idle timeout disconnects WebSocket
- Ships only tracked when users are actively viewing
- Railway deployment with $0 usage cap

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login (sets session)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Routes
- `GET /api/routes` - Get user's routes (or sample routes if guest)
- `POST /api/routes` - Save route (logged-in only)
- `DELETE /api/routes/:id` - Delete route (logged-in only)

## Map Locations
- Russell: -35.265, 174.121
- Kai Iwi Lakes: -35.780, 173.700
- Kaipara Harbour: -36.500, 174.100

## Dependencies
- express, body-parser, cors
- pg (PostgreSQL)
- ws (WebSocket)
- bcrypt (password hashing)
- express-session, connect-pg-simple (sessions)
- dotenv (environment variables)
