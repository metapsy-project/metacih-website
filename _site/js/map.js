
// Initialize the map
const map = L.map('map').setView([20, 0], 2); // Set initial view [latitude, longitude], and zoom level

  // Add a tile layer (basemap)
  // Define different tile layers
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
  });
  
  const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: 'Tiles © Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  });
  
  // Add initial tile layer to the map
  osm.addTo(map);
  
  // Add layer control for switching
  L.control.layers({
    "OpenStreetMap": osm,
    "Esri Satellite": esriSatellite
  }).addTo(map);
  

  // Define locations with annotations
  const locations = [
    { coords: [41.8781, -87.6298], label: `<b>University of Illinois, Chicago</b> <br> Meta-Analysis, Data Mining, Methodology` },
    { coords: [40.7170, -73.6018], label: `<b>Hofstra University, New York</b> <br> Zucker Hillside Hospital, Methodological Projects` },
    { coords: [51.7548, -1.2544], label: `<b>University of Oxford</b> <br> Meta-Analysis, Smartphone Apps` },
    { coords: [51.5111, -0.1162], label: `<b>King's College London</b> <br> Clinical Trials, Dose-Response Meta-Analysis<br> (Visiting Professor SL)` },
    { coords: [48.8470, 2.3445], label: `<b>Université Paris Descartes</b> <br> Meta-Analyses` },
    { coords: [52.0907, 5.1214], label: "<b>Universiteit Utrecht</b> <br> Clinical Trials" },
    { coords: [59.3480, 18.0299], label: "<b>Karolinska Institutet</b><br> Analysis of National Registers" },
    { coords: [56.1681, 10.2034], label: "<b>Aarhus University</b><br> em. Honorary Professor SL" },
    { coords: [52.0876, 5.1646], label: "<b>ECNP</b><br> SL Lecturer for Psychiatrist Trainings" },
    { coords: [39.6246, 20.8537], label: "<b>University of Ioannina</b><br>Meta-Analyses" },
    { coords: [45.4342, 10.9916], label: "<b>University of Verona</b><br>Meta-Analyses" },
    { coords: [32.7614, 35.0054], label: "<b>University of Haifa, Israel</b><br>Analysis of Individual Patient Data, Equipercentile Linking, Network Analysis" },
    { coords: [46.9524, 7.4396], label: "<b>Institute of Social and Preventive Medicine (ISPM), University of Bern</b><br>Meta-Analysis, Living Systematic Reviews of COVID Consequences for Mental Health, Methodological Projects" },
    { coords: [31.2304, 121.4737], label: "<b>Shanghai Mental Health Center</b><br>Joint Sino-German Grant<br>SL Visiting Professor<br>Visiting researchers from China" },
    { coords: [35.0263, 135.7809], label: "<b>University of Kyoto</b><br>Meta-Analysis, Methodology in EBM, Outcome Research" },
    { coords: [-37.8136, 144.9631], label: "<b>Cochrane Schizophrenia Group</b><br>Co-lead by Melbourne and Munich (Irene Bighelli)" }
  ];

  // Add markers to the map
  locations.forEach(location => {
    const marker = L.marker(location.coords).addTo(map);
    marker.bindPopup(location.label); // Annotation using popup
  });

