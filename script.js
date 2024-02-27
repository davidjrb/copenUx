// Define the base URL at the beginning of your script
const BASE_URL = 'https://rvk.netport.is/api';

document.addEventListener('DOMContentLoaded', async function() {
    initMap();
    await loadData();
    await addPermanentMarkers();
    setupLayerMenuToggle();
});

let map;
let dsColors = {};
let permanentMarkers = {};
let markers = {};
let layersVisibility = {};
let lampsData = [];
let lampMarkers = {};

L.Control.ZoomLabel = L.Control.extend({
    onAdd: function(map) {
        var container = L.DomUtil.create('div', 'leaflet-control-zoomlabel');
        map.on('zoomend', () => {
            container.innerHTML = 'Zoom: ' + map.getZoom();
        });
        return container;
    }
});

function initMap() {
    map = L.map('map').setView([64.14, -21.96], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    new L.Control.ZoomLabel({ position: 'topleft' }).addTo(map);
}
async function refreshLampMarkersForDS(ds) {
    // Check if there are existing markers for this DS and remove them
    if (lampMarkers[ds]) {
        lampMarkers[ds].forEach(marker => map.removeLayer(marker));
        lampMarkers[ds] = [];
    }

    // Fetch the latest lamp data for this DS from the database
    try {
        const response = await fetch(`${BASE_URL}/get/ds/${ds}/lamps`);
        const lampsDataForDS = await response.json();

        // Create new markers for the lamps with the latest data
        lampsDataForDS.forEach(lamp => {
            const lampMarkerColor = lamp.marker_color.startsWith('#') ? lamp.marker_color : `#${lamp.marker_color}`;
            const lampMarker = L.circleMarker([lamp.lat, lamp.lon], {
                color: lampMarkerColor,
                fillColor: lampMarkerColor,
                fillOpacity: 0.5,
                radius: 8
            }).addTo(map).bindPopup(`Lamp ID: ${lamp.id}`);

            // Initially set marker visibility
            if (lamp.marker_visible) {
                lampMarker.addTo(map);
            } else {
                lampMarker.remove();
            }

            lampMarkers[ds].push(lampMarker);
        });
    } catch (error) {
        console.error(`Error loading lamps data for DS ${ds}:`, error);
    }
}
async function changeLampColor(ds) {
    const colorPicker = document.getElementById(`colorPicker-${ds}`);
    const color = colorPicker.value.substring(1); // Remove '#' from the color value for API call

    try {
        // Update the lamp color in the database via API
        const response = await fetch(`${BASE_URL}/set/ds/${ds}/hex/${color}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json();
        console.log(`Color updated for DS ${ds}:`, data);

        // Refresh the lamp markers to reflect the new color
        await refreshLampMarkersForDS(ds);
    } catch (error) {
        console.error(`Error updating color for DS ${ds}:`, error);
    }
}

async function loadData() {
    try {
        const lampsResponse = await fetch(`${BASE_URL}/get/all/lamps`);
        lampsData = await lampsResponse.json();
        console.log('Lamps data loaded:', lampsData);

        // Clear existing lamp markers if re-loading data
        Object.values(lampMarkers).flat().forEach(marker => map.removeLayer(marker));
        lampMarkers = {}; // Reset the lampMarkers object for fresh loading

        // Create markers for lamps based on visibility
        lampsData.forEach(lamp => {
            if (!lampMarkers[lamp.ds]) {
                lampMarkers[lamp.ds] = [];
            }
            
            const lampMarkerColor = lamp.marker_color.startsWith('#') ? lamp.marker_color : `#${lamp.marker_color}`;
            const lampMarker = L.circleMarker([lamp.lat, lamp.lon], {
                color: lampMarkerColor,
                fillColor: lampMarkerColor,
                fillOpacity: 0.5,
                radius: 8
            }).bindPopup(createLampPopupContent(lamp));

            // Check the marker_visible attribute before adding to map
            if (lamp.marker_visible) {
                lampMarker.addTo(map);
            }

            lampMarkers[lamp.ds].push(lampMarker);
        });
    } catch (error) {
        console.error('Error loading lamps data:', error);
    }
}





async function addPermanentMarkers() {
    try {
        const response = await fetch(`${BASE_URL}/get/ds/all`);
        const data = await response.json();
        console.log('Data loaded:', data);

        // Define a custom icon
        const customIcon = L.icon({
            iconUrl: 'icons/lightning-icon.svg',
            iconSize: [30, 50], // Size of the icon
            iconAnchor: [15, 50], // Point of the icon which will correspond to marker's location
            popupAnchor: [0, -50] // Point from which the popup should open relative to the iconAnchor
        });

        data.forEach(item => {
            const marker = L.marker([item.lat, item.lon], { icon: customIcon });

            // Bind popup with detailed information
            marker.bindPopup(createPopupContent(item))
                .addTo(map);

            // Add a permanent label above the marker
            marker.bindTooltip(`Skápur: ${item.name}_01`, { 
                permanent: true,
                direction: 'top',
                offset: L.point(0, -40),
                className: 'custom-tooltip' // Add a custom class name
            });

            // Store the marker for potential future use
            permanentMarkers[item.ds] = marker;
        });
    } catch (error) {
        console.error('Error loading data:', error);
    }
}


function createPopupContent(item) {
    const isChecked = layersVisibility[item.ds] ? 'checked' : '';
    // Assume dsColors[item.ds] holds the current color for the DS's lamps, in hex format (e.g., "#ff0000")
    const currentColor = dsColors[item.ds] ? dsColors[item.ds] : '#ff0000'; // Default to red if not set

    return `
        <div>Skápur: <b>${item.name}_01</b><br>Address: ${item.address}</div>
        <label><input type="checkbox" onclick="handlePopupCheckboxClick(this)" value="${item.ds}" ${isChecked}> DS ${item.ds}</label>
        <br><input type="color" id="colorPicker-${item.ds}" value="${currentColor}">
        <button onclick="changeLampColor(${item.ds})">Update Color</button>
        <br><a href="${item.lukor}" target="_blank">Lukor</a> | 
        <a href="${item.docs}" target="_blank">Skjöl</a>
    `;
}

function createLampPopupContent(lamp) {
    return `
        <div>Name: <b>${lamp.name}</b><br>DS: ${lamp.ds}</div>
        <a href="${lamp.lukor}" target="_blank">Lukor</a>
    `;
}


function setupLayerMenuToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const layerMenu = document.getElementById('layerMenu');
    if (menuToggle && layerMenu) {
        menuToggle.addEventListener('click', function() {
            layerMenu.classList.toggle('open');
        });
    } else {
        console.error('Menu toggle or layer menu not found');
    }
}

window.handlePopupCheckboxClick = handlePopupCheckboxClick;

async function handlePopupCheckboxClick(checkbox) {
    const dsNumber = checkbox.value;
    const isChecked = checkbox.checked;
    await setVisibilityForSubstation(dsNumber, isChecked);

    // If the checkbox is checked, refresh the lamp markers for this DS
    if (isChecked) {
        await refreshLampMarkersForDS(dsNumber);
    }
}


async function setVisibilityForSubstation(ds, visibility) {
    try {
        // Use the base URL
        const response = await fetch(`${BASE_URL}/set/ds/${ds}/show/${visibility ? 1 : 0}`, {
            method: 'POST',
        });
        const data = await response.json();
        console.log('Visibility updated for DS:', data);

        // Toggle visibility of lamp markers associated with this DS on the map
        if (lampMarkers[ds]) {
            lampMarkers[ds].forEach(marker => {
                if (visibility) {
                    marker.addTo(map); // Show lamp marker
                } else {
                    map.removeLayer(marker); // Hide lamp marker
                }
            });
        }
    } catch (error) {
        console.error('Error updating visibility for DS:', error);
    }
}
