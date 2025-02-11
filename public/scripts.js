/* filepath: /Users/benmarrett/Work/Leaflet/scripts.js */
var map = L.map('map').setView([-35.0, 173.9], 9); // Default to Northland, NZ
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let OPENWEATHERMAP_API_KEY  = '27c6e79be9423886a98849c4688af3cf';

var weatherLayer = L.tileLayer('https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={apiKey}', {
    layer: 'wind_new', // You can use different layers like 'clouds_new', 'precipitation_new', 'pressure_new', 'wind_new', etc.
    apiKey: OPENWEATHERMAP_API_KEY, // Replace with your OpenWeatherMap API key
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
}).addTo(map);

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
        layer.bindPopup('<b>' + routeName + '</b><br>Distance: ' + layer.routeDistance.toFixed(2) + ' km');
        drawnItems.addLayer(layer);
        updateRouteList();
    }
});

function saveRoutes() {
    var routes = [];
    drawnItems.eachLayer(function (layer) {
        routes.push({
            geojson: layer.toGeoJSON(),
            name: layer.routeName || "Unnamed Route",
            distance: layer.routeDistance || 0,
            color: layer.options.color || "#3388ff"
        });
    });
    localStorage.setItem("sailing_routes", JSON.stringify(routes));
    alert("Routes saved!");
    updateRouteList();
}

function loadRoutes() {
    var data = localStorage.getItem("sailing_routes");
    if (data) {
        var routes = JSON.parse(data);
        routes.forEach(function (route) {
            var layer = L.geoJSON(route.geojson, { style: { color: route.color } }).getLayers()[0];
            layer.routeName = route.name;
            layer.routeDistance = route.distance;
            layer.bindPopup('<b>' + route.name + '</b><br>Distance: ' + route.distance.toFixed(2) + ' km');
            drawnItems.addLayer(layer);
        });
        updateRouteList();
    }
}

function updateRouteList() {
    var list = document.getElementById("routes-list");
    list.innerHTML = "";
    drawnItems.eachLayer(function (layer, index) {
        var item = document.createElement("div");
        item.className = "route-item";
        item.textContent = layer.routeName + " - " + layer.routeDistance.toFixed(2) + " km";
        item.onclick = function () { map.fitBounds(layer.getBounds()); };
        list.appendChild(item);
    });
}

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
        return totalDistance / 1000; // Convert meters to km
    }
    return 0;
}

var iconOptions = {
    iconUrl: 'assets/sailingBoat.png', // Path to your custom icon
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
};
var customIcon = L.icon(iconOptions);

var russellMarker = L.marker([-35.265, 174.121], { icon: customIcon }).addTo(map).bindPopup('Russell');
var paihiaMarker = L.marker([-35.283, 174.091], { icon: customIcon }).addTo(map).bindPopup('Paihia');
var kaiIwiLakesMarker = L.marker([-35.780, 173.700], { icon: customIcon }).addTo(map).bindPopup('Kai Iwi Lakes');
var kaiparaHarbourMarker = L.marker([-36.500, 174.100], { icon: customIcon }).addTo(map).bindPopup('Kaipara Harbour');

russellMarker.on('click', function() { zoomToLocation(-35.265, 174.121); });
paihiaMarker.on('click', function() { zoomToLocation(-35.283, 174.091); });
kaiIwiLakesMarker.on('click', function() { zoomToLocation(-35.780, 173.700); });
kaiparaHarbourMarker.on('click', function() { zoomToLocation(-36.500, 174.100); });

async function fetchWeather(lat, lon) {
    const apiKey = OPENWEATHERMAP_API_KEY; // Replace with your OpenWeatherMap API key
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    console.log(`Fetching weather data from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        console.error('Failed to fetch weather data:', response.statusText);
        return null;
    }
    const data = await response.json();
    console.log('Weather data:', data);
    return data;
}

async function displayWeather(lat, lon) {
    console.log(`Displaying weather for location: ${lat}, ${lon}`);
    const weatherData = await fetchWeather(lat, lon);
    if (!weatherData) {
        console.error('No weather data available');
        return;
    }
    console.log('Displaying weather data:', weatherData);
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

map.on('load', function() {
    console.log('Map loaded');
    displayWeather(map.getCenter().lat, map.getCenter().lng);
});