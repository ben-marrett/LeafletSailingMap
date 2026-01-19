# Crow's Nest
### Sailing Adventure Map

**Live Demo: [crowsnest.up.railway.app](https://crowsnest.up.railway.app)**

## Overview

Crow's Nest is a real-time ship tracking and route planning app for New Zealand waters. Built with Leaflet.js, it features live AIS ship tracking, interactive route drawing, weather data, and a nautical-themed interface.

The app highlights **R Tucker Thompson** (MMSI: 512120000), a tall ship sailing New Zealand waters, with its own dedicated tracking panel and special marker.

This project was created for my teenage son, who is currently a trainee on a tall ship and plans to acquire and sail his own boat.

## Features

### Ship Tracking
- **Live AIS Tracking**: Real-time ship positions via AISStream WebSocket
- **Auto-Connect**: Ships appear automatically when page loads
- **Class A & B Support**: Tracks both commercial vessels and smaller craft
- **Smooth Movement**: Ships animate smoothly to new positions
- **Auto-Reconnect**: Automatically reconnects if connection drops

### R Tucker Thompson
- **Highlighted Vessel**: Distinct gold marker icon
- **Dedicated Panel**: Shows speed, course, and last update time
- **Track History**: View RTT's path (builds in browser memory)
- **Locate & Follow**: Quick buttons to find RTT on the map
- **Fallback Position**: Shows home port (Opua) if live data unavailable
- **Celebration**: Horn sound and animation when RTT is spotted

### Route Planning
- **Draw Routes**: Create sailing routes with the drawing tools
- **Distance Calculation**: Automatic distance measurement in km
- **Color Coding**: Choose custom colors for routes
- **Sample Routes**: Pre-loaded Bay of Islands routes for demo
- **Edit & Delete**: Modify or remove saved routes
- **Tooltips**: Hover to see route names

### User Experience
- **No Login Required**: Full demo experience for guests
- **Optional Accounts**: Register to save routes permanently
- **Mobile Responsive**: Works on phones, tablets, and desktop
- **Multiple Map Layers**: Switch between Street Map and Ocean Chart
- **Nautical Markers**: Toggle OpenSeaMap overlay for buoys and channels
- **Weather Popups**: Click locations to see current weather
- **15-Minute Idle Timeout**: Saves resources when inactive
- **Connection Status**: Visual indicator shows live connection

### Design
- **Nautical Theme**: Old paper background, maritime styling
- **Custom Icons**: Anchor markers, ship icons, RTT special marker
- **Responsive Layout**: Adapts to screen size
- **Layer Control**: Easy toggle between map styles

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [PostgreSQL](https://www.postgresql.org/) (v14+)

### Installation

```bash
# Clone the repository
git clone https://github.com/ben-marrett/LeafletSailingMap.git
cd LeafletSailingMap

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Set up the database
createdb sailing_map
psql sailing_map < db/init.sql
psql sailing_map < db/sample-routes.sql

# Start the server
npm start
```

Open `http://localhost:8000` in your browser.

## Environment Variables

```
AIS_API_KEY=your_aisstream_api_key
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=sailing_map
DB_PASSWORD=your_db_password
DB_PORT=5432
SESSION_SECRET=random_32_char_string
```

Get a free AIS API key at [aisstream.io](https://aisstream.io/).

## Tech Stack

- **Frontend**: Leaflet.js, Leaflet.Draw, vanilla JavaScript
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Real-time**: WebSocket (ws library)
- **Auth**: bcrypt, express-session
- **APIs**: AISStream (ships), OpenWeatherMap (weather)

## Future Enhancements

### Planned Features
- **Alert Zones**: Draw areas on map, get notified when vessels enter
- **Track Additional Vessels**: Logged-in users can follow other ships by MMSI
- **Historical Tracks**: Store and display ship position history from database
- **Voyage Planning**: Calculate ETAs, waypoints, and fuel estimates
- **Tide Data**: Show tide times and heights for ports
- **Dark Mode**: Night-friendly colour scheme

### Potential Improvements
- **Vessel Details**: Fetch and display ship names, types, destinations
- **Search**: Find vessels by name or MMSI
- **Clustering**: Group ships when zoomed out
- **Offline Support**: Cache map tiles for offline use
- **Push Notifications**: Alert when RTT enters/leaves areas
- **Share Routes**: Public links to share routes with others
- **GPX Import/Export**: Import routes from GPS devices
- **Speed/Course Filters**: Show only moving vessels or filter by heading

### Technical Debt
- Move OpenWeatherMap API key to server-side proxy
- Add comprehensive error handling
- Add unit and integration tests
- Implement rate limiting on API endpoints

## Deployment

### Railway (Recommended)

1. Connect GitHub repo to Railway
2. Add PostgreSQL database (one-click provision)
3. Set environment variables in Railway dashboard
4. Set Usage Limit: $0 (Settings > Usage > hard cap)
5. Deploy

### Other Platforms

Works on any platform supporting Node.js and PostgreSQL:
- Heroku
- DigitalOcean App Platform
- Render
- Self-hosted VPS

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgements

- [Leaflet.js](https://leafletjs.com/) - Interactive maps
- [AISStream](https://aisstream.io/) - Real-time AIS data
- [OpenSeaMap](https://openseamap.org/) - Nautical chart overlay
- [OpenWeatherMap](https://openweathermap.org/) - Weather data
- [ESRI](https://www.esri.com/) - Ocean basemap tiles
- [Flaticon](https://www.flaticon.com/) - Icon resources
