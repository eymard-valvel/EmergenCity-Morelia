import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWR1YXJkbzI1MGplbW0iLCJhIjoiY2xwYzVvdzc3MDNlYjJoazUzbzZsYjRwNiJ9.KsDXLdjWn2R4fMX-YIIU8g';

function MapaNavegacionConductor() {
  const [map, setMap] = useState(null);
  const [directions, setDirections] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeInfo, setRouteInfo] = useState({ 
    distance: 0, 
    duration: 0,
    nextInstruction: '',
    nextDistance: 0
  });
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [currentAmbulance] = useState({
    id: 'AMB-001',
    placa: 'ABC123',
    tipo: 'UVI Móvil'
  });

  const mapContainer = useRef(null);
  const watchId = useRef(null);
  const accidentMarker = useRef(null);
  const hospitalMarker = useRef(null);

  // Destinos predefinidos
  const destinations = [
    { 
      id: 'ACC-001', 
      name: 'Accidente - Av. Madero 123',
      type: 'accidente',
      lat: 19.682937, 
      lng: -101.191438,
      direccion: 'Avenida Madero 123, Centro'
    },
    { 
      id: 'HOSP-001', 
      name: 'Hospital Star Medica',
      type: 'hospital', 
      lat: 19.682937, 
      lng: -101.191438,
      direccion: 'Hospital Star Medica, Morelia'
    },
    { 
      id: 'HOSP-002', 
      name: 'IMSS Morelia',
      type: 'hospital',
      lat: 19.68219, 
      lng: -101.17451,
      direccion: 'IMSS Hospital General, Morelia'
    }
  ];

  // Inicializar geolocalización en tiempo real con orientación
  const initRealTimeGeolocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocalización no soportada');
      simulateDriverLocation();
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: newSpeed, heading: newHeading } = position.coords;
        
        const location = {
          lat: latitude,
          lng: longitude,
          speed: newSpeed ? (newSpeed * 3.6) : 0,
          heading: newHeading || 0
        };

        setCurrentLocation(location);
        setSpeed(newSpeed ? Math.round(newSpeed * 3.6) : 0);
        setHeading(newHeading || 0);

        // Actualizar mapa en tiempo real con perspectiva 3D
        if (map && isNavigating) {
          map.flyTo({
            center: [longitude, latitude],
            zoom: 17, // Más zoom para vista más cercana
            pitch: 60, // Más inclinación para mejor vista 3D
            bearing: newHeading || 0, // Seguir orientación del dispositivo
            essential: true,
            duration: 500 // Transición más rápida
          });
        }
      },
      (error) => {
        console.error('Error en geolocalización:', error);
        simulateDriverLocation();
      },
      options
    );
  };

  // Simulación de ubicación del conductor
  const simulateDriverLocation = () => {
    const simulatedLocation = {
      lat: 19.702428,
      lng: -101.1969319,
      speed: 45,
      heading: 90
    };

    setCurrentLocation(simulatedLocation);
    setSpeed(45);
    setHeading(90);
  };

  // Crear marcadores personalizados
  const createCustomMarkers = () => {
    if (!map) return;

    // Limpiar marcadores existentes
    if (accidentMarker.current) accidentMarker.current.remove();
    if (hospitalMarker.current) hospitalMarker.current.remove();

    // Marcador de accidente
    const accidentEl = document.createElement('div');
    accidentEl.className = 'accident-marker';
    accidentEl.innerHTML = '🚨';
    accidentEl.style.fontSize = '30px';
    accidentEl.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    
    accidentMarker.current = new mapboxgl.Marker(accidentEl)
      .setLngLat([-101.191438, 19.682937])
      .setPopup(new mapboxgl.Popup().setHTML('<strong>🚨 Accidente</strong><br>Av. Madero 123'))
      .addTo(map);

    // Marcador de hospital
    const hospitalEl = document.createElement('div');
    hospitalEl.className = 'hospital-marker';
    hospitalEl.innerHTML = '🏥';
    hospitalEl.style.fontSize = '30px';
    hospitalEl.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    
    hospitalMarker.current = new mapboxgl.Marker(hospitalEl)
      .setLngLat([-101.17451, 19.68219])
      .setPopup(new mapboxgl.Popup().setHTML('<strong>🏥 IMSS Morelia</strong><br>Hospital General'))
      .addTo(map);
  };

  useEffect(() => {
    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-guidance-day-v4', // Estilo específico para navegación 3D
      center: [-101.1969319, 19.702428],
      zoom: 15,
      pitch: 60, // Vista inclinada para 3D
      bearing: 0,
      antialias: true // Mejor calidad para edificios 3D
    });

    // Configuración de direcciones para navegación
    const directionsInstance = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: 'metric',
      profile: 'driving',
      controls: {
        inputs: false,
        instructions: false,
        profileSwitcher: false
      },
      interactive: false,
      steps: true,
      alternatives: false,
      congestion: true // Mostrar tráfico
    });

    mapInstance.addControl(directionsInstance, 'top-left');
    
    // Control de geolocalización mejorado
    const geoControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: false
    });

    mapInstance.addControl(geoControl);

    // Agregar control de navegación 3D
    mapInstance.addControl(new mapboxgl.NavigationControl());

    // Eventos de direcciones
    directionsInstance.on('route', (e) => {
      if (e.route && e.route[0]) {
        const route = e.route[0];
        const nextStep = route.legs[0]?.steps[0];
        const nextInstruction = nextStep?.maneuver?.instruction || 'Siga la ruta';
        const nextDistance = nextStep ? (nextStep.distance / 1000).toFixed(1) : 0;
        
        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.round(route.duration / 60),
          nextInstruction,
          nextDistance
        });
      }
    });

    directionsInstance.on('step', (e) => {
      const instruction = e.step?.maneuver?.instruction || 'Siga la ruta';
      const distance = e.step ? (e.step.distance / 1000).toFixed(1) : 0;
      
      setRouteInfo(prev => ({
        ...prev,
        nextInstruction: instruction,
        nextDistance: distance
      }));
    });

    mapInstance.on('load', () => {
      // Habilitar edificios 3D
      mapInstance.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.6
        }
      });

      // Crear marcadores
      createCustomMarkers();

      // Iniciar geolocalización
      setTimeout(() => {
        initRealTimeGeolocation();
        geoControl.trigger();
      }, 1000);
    });

    setMap(mapInstance);
    setDirections(directionsInstance);

    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      mapInstance.remove();
    };
  }, []);

  // Función para iniciar navegación a un destino
  const startNavigation = (dest) => {
    if (!map || !directions || !currentLocation) return;

    setIsNavigating(true);
    setDestination(dest);
    
    // Configurar navegación
    directions.setOrigin([currentLocation.lng, currentLocation.lat]);
    directions.setDestination([dest.lng, dest.lat]);
    
    // Configurar vista 3D para navegación
    map.flyTo({
      center: [currentLocation.lng, currentLocation.lat],
      zoom: 17, // Zoom más cercano
      pitch: 60, // Vista más inclinada
      bearing: heading, // Seguir orientación actual
      essential: true
    });
  };

  // Función para finalizar navegación
  const finishNavigation = () => {
    setIsNavigating(false);
    setDestination(null);
    
    if (directions) {
      directions.removeRoutes();
    }

    // Volver a vista normal
    if (map && currentLocation) {
      map.flyTo({
        center: [currentLocation.lng, currentLocation.lat],
        zoom: 15,
        pitch: 45,
        bearing: 0
      });
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#000'
    }}>
      
      {/* Header Simple */}
      <div style={{
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '12px 15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #d32f2f'
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d32f2f' }}>
            🚑 {currentAmbulance.id} - {currentAmbulance.placa}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {currentAmbulance.tipo}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>⚡ {speed} km/h</div>
          <div style={{ color: isNavigating ? '#4caf50' : '#ff9800' }}>
            {isNavigating ? '📍 EN RUTA' : '🛑 DISPONIBLE'}
          </div>
        </div>
      </div>

      {/* Contenedor del Mapa */}
      <div 
        ref={mapContainer} 
        style={{ 
          flex: 1,
          position: 'relative'
        }} 
      />

      {/* Panel de Navegación en Tiempo Real */}
      {isNavigating && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '15px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #333'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '10px'
          }}>
            <div>
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '16px', 
                color: destination?.type === 'accidente' ? '#ff5252' : '#4caf50',
                marginBottom: '4px'
              }}>
                {destination?.type === 'accidente' ? '🚨 ' : '🏥 '}
                {destination?.name}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {destination?.direccion}
              </div>
            </div>
            <div style={{ 
              backgroundColor: destination?.type === 'accidente' ? '#d32f2f' : '#2e7d32',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              {destination?.type === 'accidente' ? 'EMERGENCIA' : 'HOSPITAL'}
            </div>
          </div>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            fontSize: '14px',
            marginBottom: '12px'
          }}>
            <div>📏 {routeInfo.distance} km total</div>
            <div>⏱️ {routeInfo.duration} min</div>
          </div>
          
          {/* Instrucción de navegación actual */}
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            borderLeft: '4px solid #2196f3',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>🧭 {routeInfo.nextInstruction}</span>
            {routeInfo.nextDistance > 0 && (
              <span style={{ 
                fontSize: '12px', 
                backgroundColor: '#2196f3',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '10px'
              }}>
                {routeInfo.nextDistance} km
              </span>
            )}
          </div>
        </div>
      )}

      {/* Panel de Control del Conductor */}
      <div style={{
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '15px',
        borderTop: '1px solid #333'
      }}>
        {!isNavigating ? (
          <div>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              marginBottom: '12px', 
              color: '#fff',
              textAlign: 'center'
            }}>
              🎯 SELECCIONAR DESTINO
            </div>
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {destinations.map(dest => (
                <button
                  key={dest.id}
                  onClick={() => startNavigation(dest)}
                  style={{
                    padding: '14px',
                    backgroundColor: dest.type === 'accidente' ? 'rgba(211, 47, 47, 0.2)' : 'rgba(52, 168, 83, 0.2)',
                    border: `2px solid ${dest.type === 'accidente' ? '#d32f2f' : '#34a853'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    color: 'white',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                    {dest.type === 'accidente' ? '🚨 ' : '🏥 '}
                    {dest.name}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                    {dest.direccion}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={finishNavigation}
              style={{
                padding: '15px 30px',
                backgroundColor: '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                width: '100%',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#b71c1c';
                e.target.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#d32f2f';
                e.target.style.transform = 'scale(1)';
              }}
            >
              ✅ FINALIZAR NAVEGACIÓN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapaNavegacionConductor;