
dir structure:

~/reykjavik-html/vestur
.
├── data
│  ├── ds.csv
│  ├── lamp_layers.csv
│  └── lamps.csv
├── docs
│  └── manifesto.md
├── icons
│  └── lightning-icon.svg
├── index.html
├── layerMenu.js
├── script.js
└── styles.css

---

index.html

~~~html
<!DOCTYPE html>
<html>
<head>
  <title>Reykjavik Lights</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <button id="menuToggle">Lampar</button>
  <div id="layerMenu" class="layer-menu">
    <div id="layerSelector">
      <!-- Checkboxes will be dynamically added here -->
    </div>
  </div>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js"></script>
  <script src="script.js"></script>
  <script src="layerMenu.js"></script>
</body>
</html>
~~~


---

styles.css

~~~css
body, html {
    height: 100%;
    margin: 0;
    padding: 0;
}

#map {
    width: 100%;
    height: 100%;
}

.leaflet-control-zoomlabel {
    background-color: rgba(255, 255, 255, 0.8); /* semi-transparent white background */
    border-radius: 8px; /* rounded corners */
    padding: 5px 10px; /* some padding for aesthetics */
    font-size: 14px; /* font size */
    font-weight: bold; /* make text bold */
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.4); /* subtle shadow for depth */
}

.layer-menu {
  position: absolute;
  top: 50px; /* Adjust based on your layout */
  right: 0;
  width: 250px; /* Adjust the width as necessary */
  background: white;
  box-shadow: 0 0 15px rgba(0,0,0,0.2);
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
  z-index: 500; /* Ensure it's above the map but below the toggle button */
}

.layer-menu.open {
  transform: translateX(0%);
}

#menuToggle {
  position: absolute;
  top: 10px; /* Adjust based on your layout */
  right: 10px; /* Position the toggle button on the right */
  z-index: 1000; /* Ensure it's above the map */
  background-color: #fff;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0,0,0,0.2);
}
~~~


---

script.js

~~~js
// Custom control to display zoom level
L.Control.ZoomLabel = L.Control.extend({
    options: {
        position: 'topleft'
    },
    onAdd: function(map) {
        this._container = L.DomUtil.create('div', 'leaflet-control-zoomlabel');
        this.update();
        return this._container;
    },
    update: function() {
        if (this._map) {
            this._container.innerHTML = 'Zoom: ' + this._map.getZoom();
        }
    }
});

// Map initialization
let map = L.map('map').setView([64.14, -21.96], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
new L.Control.ZoomLabel().addTo(map);

// Markers storage
let markers = [];

// Load and parse lamps data
let lampsData = [];
fetch('data/lamps.csv')
.then(response => response.text())
.then(data => {
    lampsData = Papa.parse(data, {header: true}).data;
})
.catch(error => console.log('Error loading lamps data:', error));

// Function to adjust marker style based on zoom level
map.on('zoomend', function() {
    adjustMarkerStyle();
});

function adjustMarkerStyle() {
    let zoomLevel = map.getZoom();
    markers.forEach(marker => {
        let newRadius = zoomLevel <= 14 ? 2 : 5;
        let newWeight = zoomLevel <= 14 ? 0 : 1;
        marker.setStyle({radius: newRadius, weight: newWeight});
    });
}

function getInitialStyle() {
    let zoomLevel = map.getZoom();
    return {
        radius: zoomLevel <= 14 ? 2 : 5,
        weight: zoomLevel <= 14 ? 0 : 1,
        fillColor: '#f03',
        color: '#f03',
        fillOpacity: 0.5
    };
}

// Custom SVG icon for permanent markers
var customIcon = L.icon({
    iconUrl: 'icons/lightning-icon.svg',
    iconSize: [30, 40],
    iconAnchor: [15, 20],
    popupAnchor: [0, -20]
});

function addPermanentMarkers() {
    fetch('data/ds.csv')
    .then(response => response.text())
    .then(data => {
        const dsData = Papa.parse(data, {header: true}).data;
        dsData.forEach(item => {
            const imageUrl = 'icons/color_banner.png'; // Adjust the path as necessary
            const marker = L.marker([parseFloat(item.lat), parseFloat(item.lon)], {icon: customIcon})
                .bindPopup(`
                    Skápur: <b>${item.name}_01</b>
                    <br>Address: ${item.address}<br>
                    <a href="${item.lukor}" target="_blank">Lukor</a> | 
                    <a href="${item.docs}" target="_blank">Skjöl</a>
                    <br><img src="${imageUrl}" alt="Color Banner" style="width:100%;max-width:300px;">
                `)
                .addTo(map);
        });
    })
    .catch(error => console.error('Error loading ds.csv:', error));
}

// Toggle markers based on DS number and visibility
function updateMarkers(dsNumber, show) {
    if (show) {
        let filteredData = lampsData.filter(lamp => lamp.ds === dsNumber);
        filteredData.forEach(lamp => {
            let marker = L.circleMarker([parseFloat(lamp.lat), parseFloat(lamp.lon)], getInitialStyle()).addTo(map);
            markers.push(marker);
        });
    } else {
        markers = markers.filter(marker => {
            if (marker.options.dsNumber === dsNumber) {
                map.removeLayer(marker);
                return false;
            }
            return true;
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    addPermanentMarkers();
});
~~~




layerMenu.js

~~~js
document.addEventListener('DOMContentLoaded', function() {
    populateDsNumberSelector();
    document.getElementById('menuToggle').addEventListener('click', function() {
        document.getElementById('layerMenu').classList.toggle('open');
    });
});

function populateDsNumberSelector() {
    fetch('data/lamp_layers.csv')
    .then(response => response.text())
    .then(data => {
        let layers = Papa.parse(data, {header: true}).data;
        let layerSelector = document.getElementById('layerSelector');
        layers.forEach(layer => {
            let checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = layer.ds;
            checkbox.value = layer.ds;
            
            let label = document.createElement('label');
            label.htmlFor = layer.ds;
            label.textContent = `DS ${layer.ds}`;
            
            checkbox.addEventListener('change', handleCheckboxChange);
            
            layerSelector.appendChild(checkbox);
            layerSelector.appendChild(label);
            layerSelector.appendChild(document.createElement('br'));
        });
    })
    .catch(error => console.error('Error loading layer data:', error));
}

function handleCheckboxChange() {
    let dsNumber = this.value;
    let isChecked = this.checked;
    updateMarkers(dsNumber, isChecked);
}

~~~