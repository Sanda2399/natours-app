// Array of locations for current Tour.
const locations = JSON.parse(document.getElementById('map').dataset.locations);

///// MAPBOX API ACCESS CODE /////
mapboxgl.accessToken = 'pk.eyJ1IjoiYm1pdGNoMjkiLCJhIjoiY2t4NmliMHgwMjM4aDJ3cG5tOGkxcng0bSJ9.x7IgdbWcuE8yZGUVuijL1w';
const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/bmitch29/ckx6irc673qpv15n1i31feaum', // style URL
    scrollZoom: false,
    center: [-118.113491, 34.111745], // starting position [lng, lat]
    zoom: 10 // starting zoom
});

const bounds = new mapboxgl.LngLatBounds();

// Creating a Marker for each location in the locations array.
locations.forEach(location => {
    // Creates new Marker
    const el = document.createElement('div');
    el.className = 'marker'

    // Ensures that the bottom of the pin icon will be anchored to the exact spot of the given location.
    new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
    })
    .setLngLat(location.coordinates)
    .addTo(map); // Adds where the coordinates of the marker are located to the map.

    // Create Location Info Popup
    new mapboxgl.Popup({ offset: 30 })
    .setLngLat(location.coordinates)
    .setHTML(`<p>Day ${location.day} : ${location.description}</p>`)
    .addTo(map);

    // Extends map bounds to include the current location.
    bounds.extend(location.coordinates);
});

// Ensures the map fits the current bounds.
map.fitBounds(bounds, {
    padding: {
        top: 200,
        bottom : 200,
        left: 100,
        right: 100
    }
});