// Initialize the map first
console.log("Script starting...");
const map = L.map('map').setView([-35.0, 173.9], 9);

// Base layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
});

const esriOcean = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
});

// OpenSeaMap overlay (nautical markers, buoys, etc)
const seaMarks = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenSeaMap contributors'
});

// Add default layers
osmLayer.addTo(map);
seaMarks.addTo(map);

// Layer control (collapsed on mobile, expanded on desktop)
const baseLayers = {
    "Street Map": osmLayer,
    "Ocean Chart": esriOcean
};
const overlays = {
    "Nautical Markers": seaMarks
};
const isMobile = window.innerWidth <= 768;
L.control.layers(baseLayers, overlays, { collapsed: isMobile }).addTo(map);

// ========== STATE ==========
let currentUser = null;
let shipTracker = new Map();
let lastUpdateTime = new Map();
let isConnected = false;
let socket;
let isRegistering = false;
let idleTimer;

// R Tucker Thompson tracking
const RTT_MMSI = 512120000;
const rttTrack = [];
let rttMarker = null;
let rttTrackLine = null;
let rttLastPosition = null;
let rttLiveDataReceived = false;

// RTT home port fallback (Opua Marina)
const RTT_HOME = { lat: -35.312, lng: 174.122, name: "Opua Marina" };

// WebSocket configuration
const socketUrl = "ws://localhost:3000";
const OPENWEATHERMAP_API_KEY = '27c6e79be9423886a98849c4688af3cf';
const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes

// ========== ICONS ==========
var customIcon = L.icon({
    iconUrl: 'assets/anchor.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

var shipIcon = L.icon({
    iconUrl: 'assets/sailingBoat.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

// Special icon for R Tucker Thompson
var rttIcon = L.divIcon({
    className: 'rtt-marker-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    html: '<div style="width:36px;height:36px;background:#FFD700;border:3px solid #8B4513;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">⛵</div>'
});

// ========== DRAWING ==========
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    draw: { polyline: true, polygon: false, rectangle: false, circle: false, marker: true }
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (event) {
    var layer = event.layer;
    var routeName = prompt("Enter a name for this route:", "My Sailing Route");
    var routeColor = document.getElementById("route-color").value;
    if (routeName) {
        layer.routeName = routeName;
        layer.routeDistance = calculateDistance(layer);
        layer.setStyle({ color: routeColor });
        layer.bindPopup('<b>' + escapeHtml(routeName) + '</b><br>Distance: ' + layer.routeDistance.toFixed(2) + ' km');
        drawnItems.addLayer(layer);
        updateRouteList();

        if (!currentUser) {
            showConnectionStatus('Login to save your routes permanently!', 'info');
        }
    }
});

// ========== LOCATION MARKERS ==========
var russellMarker = L.marker([-35.265, 174.121], { icon: customIcon }).addTo(map).bindPopup('Russell');
var kaiIwiLakesMarker = L.marker([-35.780, 173.700], { icon: customIcon }).addTo(map).bindPopup('Kai Iwi Lakes');
var kaiparaHarbourMarker = L.marker([-36.500, 174.100], { icon: customIcon }).addTo(map).bindPopup('Kaipara Harbour');

russellMarker.on('click', function() { zoomToLocation(-35.265, 174.121); });
kaiIwiLakesMarker.on('click', function() { zoomToLocation(-35.780, 173.700); });
kaiparaHarbourMarker.on('click', function() { zoomToLocation(-36.500, 174.100); });

// ========== AUTH FUNCTIONS ==========
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        if (data.user) {
            currentUser = data.user;
            updateAuthUI();
        }
    } catch (err) {
        console.error('Auth check failed:', err);
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplay = document.getElementById('user-display');

    if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userDisplay.textContent = currentUser.displayName || currentUser.username;
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        userDisplay.textContent = '';
    }
}

function showLoginModal() {
    document.getElementById('login-modal').classList.add('show');
    document.getElementById('auth-error').textContent = '';
    switchToLogin();
}

function hideLoginModal() {
    document.getElementById('login-modal').classList.remove('show');
    document.getElementById('auth-form').reset();
    document.getElementById('auth-error').textContent = '';
}

function switchToRegister() {
    isRegistering = true;
    document.getElementById('modal-title').textContent = 'Register';
    document.getElementById('auth-submit-btn').textContent = 'Register';
    document.getElementById('display-name-group').style.display = 'block';
    document.getElementById('switch-to-register').style.display = 'none';
    document.getElementById('switch-to-login').style.display = 'inline';
}

function switchToLogin() {
    isRegistering = false;
    document.getElementById('modal-title').textContent = 'Login';
    document.getElementById('auth-submit-btn').textContent = 'Login';
    document.getElementById('display-name-group').style.display = 'none';
    document.getElementById('switch-to-register').style.display = 'inline';
    document.getElementById('switch-to-login').style.display = 'none';
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const errorDiv = document.getElementById('auth-error');
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const displayName = document.getElementById('displayName').value;

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const body = isRegistering
        ? { username, password, displayName }
        : { username, password };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            errorDiv.textContent = data.error || 'An error occurred';
            return;
        }

        currentUser = data;
        updateAuthUI();
        hideLoginModal();
        loadRoutes();
    } catch (err) {
        console.error('Auth error:', err);
        errorDiv.textContent = 'Connection error. Please try again.';
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        updateAuthUI();
        drawnItems.clearLayers();
        loadRoutes();
    } catch (err) {
        console.error('Logout error:', err);
    }
}

// ========== IDLE TIMEOUT ==========
function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close();
            showConnectionStatus('Ship tracking paused due to inactivity. <a href="#" onclick="reconnectShips()">Reconnect</a>', 'warning');
        }
    }, IDLE_TIMEOUT);
}

function reconnectShips() {
    hideConnectionStatus();
    connectWebSocket();
}

document.addEventListener('mousemove', resetIdleTimer);
document.addEventListener('click', resetIdleTimer);
document.addEventListener('keypress', resetIdleTimer);

// ========== CONNECTION STATUS ==========
function showConnectionStatus(message, type) {
    const statusDiv = document.getElementById('connection-status');
    statusDiv.innerHTML = message;
    statusDiv.className = 'connection-status ' + type;
}

function hideConnectionStatus() {
    const statusDiv = document.getElementById('connection-status');
    statusDiv.className = 'connection-status';
    statusDiv.innerHTML = '';
}

// ========== WEBSOCKET ==========
function connectWebSocket() {
    console.log("Attempting to connect to WebSocket...");

    if (isConnected) {
        console.log('WebSocket already connected');
        return;
    }

    try {
        socket = new WebSocket(socketUrl);

        socket.onopen = function() {
            console.log("WebSocket connection opened successfully");
            isConnected = true;
            document.getElementById('show-ships-button').textContent = 'Ships Connected';
            updateConnectionStatus(true);
            hideConnectionStatus();
            resetIdleTimer();
        };

        socket.onclose = function() {
            console.log("WebSocket connection closed");
            isConnected = false;
            document.getElementById('show-ships-button').textContent = 'Reconnecting...';
            updateConnectionStatus(false);
            // Auto-reconnect after 3 seconds unless idle timeout triggered
            setTimeout(() => {
                if (!isConnected) {
                    console.log("Auto-reconnecting...");
                    connectWebSocket();
                }
            }, 3000);
        };

        socket.onerror = function(error) {
            console.error("WebSocket error:", error);
            document.getElementById('show-ships-button').textContent = 'Connection Failed - Click to Retry';
        };

        socket.onmessage = function(event) {
            try {
                const aisMessage = JSON.parse(event.data);
                if (aisMessage.MessageType === "PositionReport" || aisMessage.MessageType === "StandardClassBPositionReport" || aisMessage.MessageType === "ExtendedClassBPositionReport") {
                    const positionReport = aisMessage.Message.PositionReport || aisMessage.Message.StandardClassBPositionReport || aisMessage.Message.ExtendedClassBPositionReport;
                    const mmsi = positionReport.UserID;
                    const shipLat = positionReport.Latitude;
                    const shipLng = positionReport.Longitude;
                    const shipSpeed = positionReport.SpeedOverGround || 0;
                    const shipCourse = positionReport.CourseOverGround || 0;
                    const timestamp = Date.now();

                    // Check if this is R Tucker Thompson
                    if (mmsi === RTT_MMSI) {
                        updateRTT(shipLat, shipLng, shipSpeed, shipCourse);
                        playRTTHorn();
                    }

                    // Update or create ship marker
                    if (shipTracker.has(mmsi)) {
                        const existingMarker = shipTracker.get(mmsi);
                        // Smooth slide to new position
                        smoothSlide(existingMarker, [shipLat, shipLng], 1000);
                        existingMarker.setRotationAngle(shipCourse);
                        updateShipPopup(existingMarker, mmsi, shipSpeed, shipCourse);
                    } else {
                        // Use special icon for RTT
                        const icon = (mmsi === RTT_MMSI) ? rttIcon : shipIcon;
                        const shipMarker = L.marker([shipLat, shipLng], {
                            icon: icon,
                            rotationAngle: (mmsi === RTT_MMSI) ? 0 : shipCourse
                        }).addTo(map);

                        updateShipPopup(shipMarker, mmsi, shipSpeed, shipCourse);
                        shipTracker.set(mmsi, shipMarker);

                        if (mmsi === RTT_MMSI) {
                            rttMarker = shipMarker;
                        }

                        updateShipCount();
                    }

                    lastUpdateTime.set(mmsi, timestamp);

                    // Clean up old ships (remove if not updated in last 10 minutes)
                    const tenMinutesAgo = timestamp - (10 * 60 * 1000);
                    lastUpdateTime.forEach((lastUpdate, shipId) => {
                        if (lastUpdate < tenMinutesAgo && shipId !== RTT_MMSI) {
                            const oldMarker = shipTracker.get(shipId);
                            if (oldMarker) {
                                map.removeLayer(oldMarker);
                                shipTracker.delete(shipId);
                                lastUpdateTime.delete(shipId);
                            }
                        }
                    });
                }
            } catch (error) {
                console.error("Error processing message:", error);
            }
        };
    } catch (error) {
        console.error("Error creating WebSocket:", error);
        isConnected = false;
    }
}

function updateShipPopup(marker, mmsi, speed, course) {
    const speedKnots = (speed * 1.943844).toFixed(1);
    const isRTT = mmsi === RTT_MMSI;
    const name = isRTT ? '<b>R Tucker Thompson</b>' : `<b>Ship ID:</b> ${mmsi}`;

    marker.bindPopup(`
        ${name}<br>
        <b>Speed:</b> ${speedKnots} knots<br>
        <b>Course:</b> ${course.toFixed(0)}°<br>
        <b>Last Update:</b> ${new Date().toLocaleTimeString()}
    `);
}

// ========== R TUCKER THOMPSON ==========
function updateRTT(lat, lng, speed, course) {
    rttLastPosition = { lat, lng, speed, course, time: Date.now() };

    // Add to track
    rttTrack.push({ lat, lng, time: Date.now() });
    if (rttTrack.length > 100) rttTrack.shift();

    // Update panel
    const statusEl = document.getElementById('rtt-status');
    const speedEl = document.getElementById('rtt-speed');
    const courseEl = document.getElementById('rtt-course');
    const updatedEl = document.getElementById('rtt-updated');

    statusEl.textContent = 'Online';
    statusEl.className = 'online';
    speedEl.innerHTML = `<b>Speed:</b> ${(speed * 1.943844).toFixed(1)} knots`;
    courseEl.innerHTML = `<b>Course:</b> ${course.toFixed(0)}°`;
    updatedEl.innerHTML = `<b>Updated:</b> ${new Date().toLocaleTimeString()}`;

    // Update track line if visible
    if (rttTrackLine) {
        const latlngs = rttTrack.map(p => [p.lat, p.lng]);
        rttTrackLine.setLatLngs(latlngs);
    }
}

function zoomToRTT() {
    if (rttLastPosition) {
        map.setView([rttLastPosition.lat, rttLastPosition.lng], 14);
        if (rttMarker) {
            rttMarker.openPopup();
        }
    } else {
        alert('R Tucker Thompson position not yet received. Please wait...');
    }
}

function showRTTTrack() {
    if (rttTrack.length < 2) {
        alert('Not enough track data yet. Keep the page open to build the track.');
        return;
    }

    if (rttTrackLine) {
        map.removeLayer(rttTrackLine);
        rttTrackLine = null;
        return;
    }

    const latlngs = rttTrack.map(p => [p.lat, p.lng]);
    rttTrackLine = L.polyline(latlngs, {
        color: '#FFD700',
        weight: 3,
        opacity: 0.8
    }).addTo(map);

    map.fitBounds(rttTrackLine.getBounds(), { padding: [50, 50] });
}

// ========== ROUTES ==========
async function saveRoutes() {
    const routes = [];
    drawnItems.eachLayer(function (layer) {
        if (!layer.isSample) {
            routes.push({
                geojson: layer.toGeoJSON(),
                name: layer.routeName || "Unnamed Route",
                distance: layer.routeDistance || 0,
                color: layer.options.color || "#3388ff"
            });
        }
    });

    if (!currentUser) {
        try {
            localStorage.setItem('sailingRoutes', JSON.stringify(routes));
            alert("Routes saved to browser storage (" + routes.length + " routes)\nLogin to save permanently!");
        } catch (e) {
            console.error("Error saving routes: ", e);
            alert("Error saving routes: " + e.message);
        }
        return;
    }

    try {
        for (const route of routes) {
            await fetch('/api/routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(route)
            });
        }
        alert("Routes saved to your account (" + routes.length + " routes)");
    } catch (e) {
        console.error("Error saving routes: ", e);
        alert("Error saving routes: " + e.message);
    }
}

async function loadRoutes() {
    drawnItems.clearLayers();

    try {
        const response = await fetch('/api/routes');
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            data.routes.forEach(function (route) {
                const distance = parseFloat(route.distance_km || route.distance || 0);
                const isSample = route.is_sample;
                const routeId = route.id;

                const geoLayer = L.geoJSON(route.geojson, {
                    style: {
                        color: route.color,
                        weight: 5,
                        opacity: 0.8
                    }
                });

                // Add each individual layer to drawnItems (for edit compatibility)
                geoLayer.eachLayer(function(layer) {
                    const safeName = escapeHtml(route.name);
                    const popupContent = '<b>' + safeName + '</b><br>Distance: ' + distance.toFixed(2) + ' km' +
                        (isSample ? '<br><em>(Sample route)</em>' :
                        '<br><button onclick="deleteRoute(' + routeId + ', this)">Delete Route</button>');
                    layer.bindPopup(popupContent);
                    layer.bindTooltip(safeName, { sticky: true });
                    layer.routeName = route.name;
                    layer.routeDistance = distance;
                    layer.isSample = isSample;
                    layer.routeId = routeId;
                    drawnItems.addLayer(layer);
                });
            });
        }

        // Also load from localStorage for guests
        if (!currentUser) {
            const savedData = localStorage.getItem('sailingRoutes');
            if (savedData) {
                const localRoutes = JSON.parse(savedData);
                localRoutes.forEach(function (route) {
                    const distance = parseFloat(route.distance || 0);
                    const popupContent = '<b>' + route.name + '</b><br>Distance: ' + distance.toFixed(2) + ' km';

                    const geoLayer = L.geoJSON(route.geojson, {
                        style: {
                            color: route.color,
                            weight: 5,
                            opacity: 0.8
                        }
                    });

                    geoLayer.eachLayer(function(layer) {
                        const safeName = escapeHtml(route.name);
                        layer.bindPopup('<b>' + safeName + '</b><br>Distance: ' + distance.toFixed(2) + ' km');
                        layer.bindTooltip(safeName, { sticky: true });
                        layer.routeName = route.name;
                        layer.routeDistance = distance;
                        drawnItems.addLayer(layer);
                    });
                });
            }
        }

        updateRouteList();
    } catch (e) {
        console.error("Error loading routes: ", e);
        // Fallback to localStorage
        const savedData = localStorage.getItem('sailingRoutes');
        if (savedData) {
            const routes = JSON.parse(savedData);
            routes.forEach(function (route) {
                const distance = parseFloat(route.distance || 0);
                const safeName = escapeHtml(route.name);
                const popupContent = '<b>' + safeName + '</b><br>Distance: ' + distance.toFixed(2) + ' km';

                const geoLayer = L.geoJSON(route.geojson, {
                    style: {
                        color: route.color,
                        weight: 5,
                        opacity: 0.8
                    }
                });

                geoLayer.eachLayer(function(layer) {
                    layer.bindPopup(popupContent);
                    layer.bindTooltip(safeName, { sticky: true });
                    layer.routeName = route.name;
                    layer.routeDistance = distance;
                    drawnItems.addLayer(layer);
                });
            });
            updateRouteList();
        }
    }
}

function updateRouteList() {
    var list = document.getElementById("routes-list");
    list.innerHTML = "";
    drawnItems.eachLayer(function (layer) {
        var item = document.createElement("div");
        item.className = "route-item" + (layer.isSample ? " sample" : "");
        item.textContent = layer.routeName + " - " + (layer.routeDistance || 0).toFixed(2) + " km";
        if (layer.isSample) {
            item.textContent += " (Sample)";
        }
        item.onclick = function () { map.fitBounds(layer.getBounds()); };
        list.appendChild(item);
    });
}

function updateShipCount() {
    const button = document.getElementById('show-ships-button');
    if (button && isConnected) {
        button.textContent = `Ships Connected (${shipTracker.size})`;
    }

    // Update header ship count with animation
    const countEl = document.getElementById('ship-count');
    if (countEl) {
        countEl.textContent = shipTracker.size + ' ships';
        countEl.classList.add('bump');
        setTimeout(() => countEl.classList.remove('bump'), 200);
    }
}

function updateConnectionStatus(connected) {
    const dot = document.getElementById('connection-dot');
    if (dot) {
        if (connected) {
            dot.classList.add('connected');
            dot.title = 'Connected to AIS stream';
        } else {
            dot.classList.remove('connected');
            dot.title = 'Disconnected';
        }
    }
}

// RTT horn sound using Web Audio API
let rttFirstSighting = true;

function showRTTFallback() {
    if (rttLiveDataReceived) return; // Already have live data

    console.log("No live RTT data - showing home port fallback");

    // Create marker at home port
    rttMarker = L.marker([RTT_HOME.lat, RTT_HOME.lng], {
        icon: rttIcon
    }).addTo(map);

    rttMarker.bindPopup(`
        <b>R Tucker Thompson</b><br>
        <em>Last known: ${RTT_HOME.name}</em><br>
        <span style="color:#888">Live tracking unavailable</span>
    `);

    rttLastPosition = { lat: RTT_HOME.lat, lng: RTT_HOME.lng };

    // Update panel
    document.getElementById('rtt-status').textContent = 'At home port';
    document.getElementById('rtt-status').className = '';
    document.getElementById('rtt-speed').innerHTML = `<b>Location:</b> ${RTT_HOME.name}`;
    document.getElementById('rtt-course').innerHTML = '<em>Live data unavailable</em>';
    document.getElementById('rtt-updated').innerHTML = '';
}

function playRTTHorn() {
    if (rttFirstSighting) {
        rttFirstSighting = false;
        rttLiveDataReceived = true;

        // Remove fallback marker if it exists
        if (rttMarker && !shipTracker.has(RTT_MMSI)) {
            map.removeLayer(rttMarker);
            rttMarker = null;
        }

        // Play foghorn sound
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.frequency.setValueAtTime(180, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 1.5);
            oscillator.type = 'sawtooth';

            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 1.5);
        } catch (e) {
            console.log('Audio not available');
        }

        // Celebration animation on RTT panel
        const panel = document.getElementById('rtt-panel');
        if (panel) {
            panel.classList.add('rtt-found');
            setTimeout(() => panel.classList.remove('rtt-found'), 1000);
        }

        // Flash notification
        showConnectionStatus('R Tucker Thompson spotted!', 'info');
        setTimeout(hideConnectionStatus, 3000);
    }
}

async function deleteRoute(routeId, buttonEl) {
    if (!confirm('Delete this route?')) return;

    if (!currentUser) {
        // For localStorage routes, find and remove
        alert('Login required to delete saved routes');
        return;
    }

    try {
        const response = await fetch('/api/routes/' + routeId, {
            method: 'DELETE'
        });

        if (response.ok) {
            map.closePopup();
            loadRoutes();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to delete route');
        }
    } catch (e) {
        console.error('Delete error:', e);
        alert('Failed to delete route');
    }
}

// ========== SMOOTH SHIP MOVEMENT ==========
function smoothSlide(marker, targetLatLng, duration) {
    const start = marker.getLatLng();
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);

        const lat = start.lat + (targetLatLng[0] - start.lat) * eased;
        const lng = start.lng + (targetLatLng[1] - start.lng) * eased;

        marker.setLatLng([lat, lng]);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

// ========== SECURITY ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== UTILITY FUNCTIONS ==========
function zoomToLocation(lat, lng) {
    console.log(`Zooming to location: ${lat}, ${lng}`);
    map.setView([lat, lng], 12);
    displayWeather(lat, lng);
}

function calculateDistance(layer) {
    if (layer.getLatLngs) {
        var latlngs = layer.getLatLngs();
        var totalDistance = 0;
        for (var i = 0; i < latlngs.length - 1; i++) {
            totalDistance += map.distance(latlngs[i], latlngs[i + 1]);
        }
        return totalDistance / 1000;
    }
    return 0;
}

// ========== WEATHER ==========
async function fetchWeather(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
        console.error('Failed to fetch weather data:', response.statusText);
        return null;
    }
    return await response.json();
}

async function displayWeather(lat, lon) {
    const weatherData = await fetchWeather(lat, lon);
    if (!weatherData) return;

    const weatherInfo = `
        <b>Weather:</b> ${weatherData.weather[0].description}<br>
        <b>Temperature:</b> ${weatherData.main.temp} °C<br>
        <b>Wind Speed:</b> ${weatherData.wind.speed} m/s<br>
        <b>Wind Direction:</b> ${weatherData.wind.deg}°
    `;
    L.popup()
        .setLatLng([lat, lon])
        .setContent(weatherInfo)
        .openOn(map);
}

// ========== INITIALIZATION ==========
window.onload = function() {
    console.log("Window loaded - initializing...");

    // Check auth status
    checkAuth();

    // Load routes (includes sample routes)
    loadRoutes();

    // Auto-connect ships
    connectWebSocket();

    // Show RTT fallback after 30 seconds if no live data
    setTimeout(showRTTFallback, 30000);

    // Set up manual reconnect button
    const button = document.getElementById('show-ships-button');
    if (button) {
        button.onclick = function() {
            if (!isConnected) {
                connectWebSocket();
            }
        };
    }

    console.log("Initialization complete");
};

console.log("Script loaded");
