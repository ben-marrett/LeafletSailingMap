# Sailing Adventure Map

## Overview

The Sailing Adventure Map is a web application that allows users to explore and track sailing routes using the Leaflet.js library.
Users can save and load routes, zoom to specific locations, and view real-time weather data.
Future enhancements include integrating AIS (Automatic Identification System) data to track ships in real-time.

This project was created for my son Noah, who is currently a trainee on the R. Tucker Thompson tallship and plans to acquire and sail his own small boat locally.

## Features

- **Interactive Map**: Explore and interact with the map using Leaflet.js.
- **Custom Styling**: Classic old sea style look with an old paper background and custom ship icons.
- **Save and Load Routes**: Save and load sailing routes.
- **Zoom to Locations**: Quickly zoom to specific locations.
- **Real-Time Weather Data**: View real-time weather data for specific locations.
- **Future Enhancements**: Integrate AIS data to track ships in real-time.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (for running a local server)
- [Git](https://git-scm.com/) (for version control)

### Installation

1. **Clone the repository**:
    ```sh
    git clone https://github.com/ben-marrett/LeafletSailingMap.git
    cd LeafletSailingMap
    ```

2. **Install dependencies** (if any):
    ```sh
    npm install
    ```

3. **Run a local server**:
    ```sh
    npx http-server
    ```

4. **Open the application**:
    Open your web browser and navigate to `http://localhost:8080`.

## Usage

- **Save Routes**: Draw a route on the map and click the "Save Routes" button to save it.
- **Load Routes**: Click the "Load Routes" button to load saved routes.
- **Zoom to Locations**: Click the buttons to zoom to specific locations (e.g., Russell, Paihia, Kai Iwi Lakes, Kaipara Harbour).
- **View Weather Data**: Real-time weather data is displayed when zooming to a location.

## Future Enhancements

- **Integrate AIS Data**: Display real-time ship positions and movements on the map.
- **Track Specific Ships**: Track specific ships by their name or MMSI.
- **Alerts for Interesting Ships**: Set up alerts for specific types of vessels, sizes, or when certain ships arrive in a designated area.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgements

- [Leaflet.js](https://leafletjs.com/)
- [OpenWeatherMap](https://openweathermap.org/)
- [Flaticon](https://www.flaticon.com/)
- [Unsplash](https://unsplash.com) (for background images)
