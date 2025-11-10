import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';

// Configuración de Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiZWR1YXJkbzI1MGplbW0iLCJhIjoiY2xwYzVvdzc3MDNlYjJoazUzbzZsYjRwNiJ9.KsDXLdjWn2R4fMX-YIIU8g';

function MapaNavegacionConductor() {
  const [map, setMap] = useState(null);
  const [directions, setDirections] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeInfo, setRouteInfo] = useState({ distance: 0, duration: 0, nextInstruction: '', nextDistance: 0 });
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [hospitalNotes, setHospitalNotes] = useState([]);
  const [destinationInput, setDestinationInput] = useState('');
  const [showDestinationInput, setShowDestinationInput] = useState(false);

  const mapContainer = useRef(null);
  const watchId = useRef(null);
  const ambulanceMarker = useRef(null);
  const prevLocation = useRef(null);

  const currentAmbulance = useRef({ 
    id: 'AMB-001', 
    placa: 'ABC123', 
    tipo: 'UVI Móvil',
    status: 'disponible'
  });

  // WebSocket para comunicación en tiempo real
  const ws = useRef(null);

  // Inicializar WebSocket
  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8081');
    
    ws.current.onopen = () => {
      console.log('Conectado al servidor WebSocket');
      // Registrar ambulancia
      ws.current.send(JSON.stringify({
        type: 'register_ambulance',
        ambulance: currentAmbulance.current
      }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'hospital_note':
          setHospitalNotes(prev => [...prev, {
            ...data.note,
            type: 'note'
          }]);
          break;
        case 'hospital_accept_patient':
          setHospitalNotes(prev => [...prev, {
            ...data,
            type: 'accept_patient',
            id: Date.now()
          }]);
          break;
        case 'active_ambulances_update':
          break;
        default:
          console.log('Mensaje recibido:', data);
      }
    };

    ws.current.onclose = () => {
      console.log('Conexión WebSocket cerrada');
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  // Calcular rumbo entre dos puntos
  const computeBearing = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const λ1 = toRad(lon1);
    const λ2 = toRad(lon2);
    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    const θ = Math.atan2(y, x);
    return (toDeg(θ) + 360) % 360;
  };

  // Crear marcador SVG para ambulancia (triángulo)
  const createAmbulanceElement = () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'ambulance-marker-wrapper';
    wrapper.style.width = '30px';
    wrapper.style.height = '30px';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';

    wrapper.innerHTML = `
      <svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <g>
          <path d="M12 2 L22 22 L2 22 Z" fill="#d32f2f" stroke="#fff" stroke-width="1.5" />
          <circle cx="12" cy="8" r="2" fill="#fff" />
        </g>
      </svg>
    `;

    wrapper.style.transformOrigin = 'center center';
    return wrapper;
  };

  // Geocodificación: convertir dirección a coordenadas
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng, name: data.features[0].place_name };
      }
      throw new Error('Dirección no encontrada');
    } catch (error) {
      console.error('Error en geocodificación:', error);
      throw error;
    }
  };

  // Inicializar mapa
  useEffect(() => {
    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-guidance-day-v4',
      center: [-101.1969319, 19.702428],
      zoom: 15,
      pitch: 45,
      bearing: 0,
    });

    // Control de direcciones
    const directionsInstance = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: 'metric',
      profile: 'driving-traffic',
      controls: { inputs: false, instructions: true, profileSwitcher: false },
      interactive: false,
      steps: true,
      alternatives: false,
      congestion: true
    });

    mapInstance.addControl(directionsInstance, 'top-left');

    // Controles del mapa
    const geoControl = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: false,
      showAccuracyCircle: false
    });

    mapInstance.addControl(geoControl);
    mapInstance.addControl(new mapboxgl.NavigationControl());

    // Eventos de rutas
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
      setRouteInfo(prev => ({ ...prev, nextInstruction: instruction, nextDistance: distance }));
    });

    mapInstance.on('load', () => {
      // Crear marcador de ambulancia
      if (!ambulanceMarker.current) {
        const el = createAmbulanceElement();
        ambulanceMarker.current = new mapboxgl.Marker({ element: el, anchor: 'center' });
      }

      // Iniciar geolocalización
      setTimeout(() => {
        initRealTimeGeolocation();
      }, 600);
    });

    setMap(mapInstance);
    setDirections(directionsInstance);

    return () => {
      if (watchId.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      mapInstance.remove();
    };
  }, []);

  // Geolocalización en tiempo real
  const initRealTimeGeolocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocalización no soportada. Usando ubicación por defecto.');
      const defaultLocation = {
        lat: 19.702428,
        lng: -101.1969319,
        speed: 0,
        heading: 0
      };
      setCurrentLocation(defaultLocation);
      return;
    }

    const options = { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 };

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: newSpeed, heading: deviceHeading } = position.coords;

        let computedHeading = deviceHeading || 0;
        if (!deviceHeading && prevLocation.current) {
          computedHeading = computeBearing(prevLocation.current.lat, prevLocation.current.lng, latitude, longitude);
        }

        const location = {
          lat: latitude,
          lng: longitude,
          speed: newSpeed ? newSpeed * 3.6 : 0,
          heading: computedHeading
        };

        // Actualizar estados
        setCurrentLocation(location);
        setSpeed(location.speed ? Math.round(location.speed) : 0);
        setHeading(Math.round(computedHeading));

        prevLocation.current = { lat: latitude, lng: longitude };

        // Actualizar marcador en mapa
        if (map && ambulanceMarker.current) {
          ambulanceMarker.current.setLngLat([location.lng, location.lat]).addTo(map);
          const el = ambulanceMarker.current.getElement();
          if (el) {
            el.style.transform = `rotate(${computedHeading}deg)`;
          }
        }

        // Enviar ubicación al servidor
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'location_update',
            ambulanceId: currentAmbulance.current.id,
            location: location,
            status: currentAmbulance.current.status
          }));
        }

        // Actualizar navegación si está activa
        if (isNavigating && directions) {
          try {
            directions.setOrigin([location.lng, location.lat]);
          } catch (err) {
            console.warn('Error actualizando origen:', err);
          }
        }

        // Mover cámara
        if (map) {
          map.flyTo({
            center: [location.lng, location.lat],
            zoom: 17,
            pitch: 45,
            bearing: computedHeading,
            duration: 1000,
            essential: true
          });
        }
      },
      (error) => {
        console.error('Error en geolocalización:', error);
        const defaultLocation = {
          lat: 19.702428,
          lng: -101.1969319,
          speed: 0,
          heading: 0
        };
        setCurrentLocation(defaultLocation);
      },
      options
    );
  };

  // Iniciar navegación a destino
  const startNavigation = async (dest) => {
    if (!map || !directions || !currentLocation) return;

    setIsNavigating(true);
    setDestination(dest);
    currentAmbulance.current.status = 'en_ruta';

    directions.setOrigin([currentLocation.lng, currentLocation.lat]);
    directions.setDestination([dest.lng, dest.lat]);

    // Notificar al servidor
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'navigation_started',
        ambulanceId: currentAmbulance.current.id,
        destination: dest,
        status: 'en_ruta'
      }));
    }

    map.flyTo({ 
      center: [currentLocation.lng, currentLocation.lat], 
      zoom: 17, 
      pitch: 45, 
      bearing: heading, 
      essential: true 
    });
  };

  // Manejar destino desde input
  const handleDestinationSubmit = async () => {
    if (!destinationInput.trim()) return;

    try {
      const destinationCoords = await geocodeAddress(destinationInput);
      const dest = {
        id: 'DEST-' + Date.now(),
        name: destinationCoords.name,
        type: 'emergencia',
        lat: destinationCoords.lat,
        lng: destinationCoords.lng,
        direccion: destinationInput
      };

      await startNavigation(dest);
      setDestinationInput('');
      setShowDestinationInput(false);
    } catch (error) {
      alert('Error: No se pudo encontrar la dirección. Intente con una dirección más específica.');
    }
  };

  // Aceptar paciente del hospital
  const acceptHospitalPatient = (note) => {
    if (!note.hospital) return;

    const hospitalDest = {
      id: note.hospital.id,
      name: note.hospital.nombre,
      type: 'hospital',
      lat: note.hospital.lat,
      lng: note.hospital.lng,
      direccion: note.hospital.ubicacion
    };

    startNavigation(hospitalDest);
    
    // Remover la notificación
    setHospitalNotes(prev => prev.filter(n => n.id !== note.id));

    // Confirmar aceptación al hospital
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'patient_accepted',
        ambulanceId: currentAmbulance.current.id,
        hospitalId: note.hospital.id
      }));
    }
  };

  // Finalizar navegación
  const finishNavigation = () => {
    setIsNavigating(false);
    setDestination(null);
    currentAmbulance.current.status = 'disponible';
    
    try { 
      directions.removeRoutes(); 
    } catch (e) { 
      console.warn('Error removiendo rutas:', e);
    }

    // Notificar al servidor
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'navigation_finished',
        ambulanceId: currentAmbulance.current.id,
        status: 'disponible'
      }));
    }

    if (map && currentLocation) {
      map.flyTo({ 
        center: [currentLocation.lng, currentLocation.lat], 
        zoom: 15, 
        pitch: 45, 
        bearing: 0 
      });
    }
  };

  // Aceptar nota del hospital
  const acceptHospitalNote = (noteId) => {
    setHospitalNotes(prev => prev.filter(note => note.id !== noteId));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#000' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #d32f2f' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d32f2f' }}>🚑 {currentAmbulance.current.id} - {currentAmbulance.current.placa}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>{currentAmbulance.current.tipo}</div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>⚡ {speed} km/h</div>
          <div style={{ color: isNavigating ? '#4caf50' : '#ff9800' }}>
            {isNavigating ? '📍 EN RUTA' : '🛑 DISPONIBLE'}
          </div>
        </div>
      </div>

      {/* Map container */}
      <div ref={mapContainer} style={{ flex: 1, position: 'relative' }} />

      {/* Input de destino */}
      {showDestinationInput && (
        <div style={{ position: 'absolute', top: '70px', left: '10px', right: '10px', backgroundColor: 'rgba(0, 0, 0, 0.9)', color: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', border: '1px solid #333' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>🎯 Ingresar Dirección de Emergencia</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={destinationInput}
              onChange={(e) => setDestinationInput(e.target.value)}
              placeholder="Ej: Av. Madero 123, Centro, Morelia"
              style={{ 
                flex: 1, 
                padding: '10px', 
                backgroundColor: '#333', 
                color: 'white', 
                border: '1px solid #555', 
                borderRadius: '6px',
                fontSize: '14px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleDestinationSubmit()}
            />
            <button 
              onClick={handleDestinationSubmit}
              style={{ 
                padding: '10px 15px', 
                backgroundColor: '#d32f2f', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Buscar
            </button>
            <button 
              onClick={() => setShowDestinationInput(false)}
              style={{ 
                padding: '10px 15px', 
                backgroundColor: '#666', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Notificaciones del hospital */}
      {hospitalNotes.length > 0 && (
        <div style={{ position: 'absolute', top: '70px', right: '10px', maxWidth: '350px', maxHeight: '400px', overflowY: 'auto' }}>
          {hospitalNotes.map(note => (
            <div key={note.id} style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.9)', 
              color: 'white', 
              padding: '12px', 
              marginBottom: '8px',
              borderRadius: '8px', 
              border: note.type === 'accept_patient' ? '2px solid #4caf50' : '1px solid #333',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: note.type === 'accept_patient' ? '#4caf50' : '#2196f3' }}>
                {note.type === 'accept_patient' ? '✅ ' : '📋 '}
                {note.hospitalInfo?.nombre || note.hospital?.nombre || 'Hospital'}
              </div>
              <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                {note.message || note.note?.message}
              </div>
              {note.patientInfo && (
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '8px' }}>
                  <strong>Paciente:</strong> {note.patientInfo}
                </div>
              )}
              <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '8px' }}>
                {note.timestamp}
              </div>
              {note.type === 'accept_patient' ? (
                <button 
                  onClick={() => acceptHospitalPatient(note)}
                  style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#4caf50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    cursor: 'pointer',
                    width: '100%',
                    fontWeight: 'bold'
                  }}
                >
                  🚑 Iniciar Ruta al Hospital
                </button>
              ) : (
                <button 
                  onClick={() => acceptHospitalNote(note.id)}
                  style={{ 
                    padding: '6px 12px', 
                    backgroundColor: '#2196f3', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    fontSize: '11px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  ✅ Entendido
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Panel de navegación */}
      {isNavigating && destination && (
        <div style={{ position: 'absolute', top: '70px', left: '10px', right: '10px', backgroundColor: 'rgba(0, 0, 0, 0.85)', color: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: destination.type === 'emergencia' ? '#ff5252' : '#4caf50', marginBottom: '4px' }}>
                {destination.type === 'emergencia' ? '🚨 ' : '🏥 '}{destination.name}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>{destination.direccion}</div>
            </div>
            <div style={{ backgroundColor: destination.type === 'emergencia' ? '#d32f2f' : '#2e7d32', color: 'white', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>
              {destination.type === 'emergencia' ? 'EMERGENCIA' : 'HOSPITAL'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', marginBottom: '12px' }}>
            <div>📏 {routeInfo.distance} km total</div>
            <div>⏱️ {routeInfo.duration} min</div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '14px', fontWeight: '500', borderLeft: '4px solid #2196f3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🧭 {routeInfo.nextInstruction}</span>
            {routeInfo.nextDistance > 0 && (
              <span style={{ fontSize: '12px', backgroundColor: '#2196f3', color: 'white', padding: '2px 6px', borderRadius: '10px' }}>
                {routeInfo.nextDistance} km
              </span>
            )}
          </div>
        </div>
      )}

      {/* Panel inferior de control */}
      <div style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '15px', borderTop: '1px solid #333' }}>
        {!isNavigating ? (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button 
              onClick={() => setShowDestinationInput(true)}
              style={{ 
                padding: '12px 20px', 
                backgroundColor: '#d32f2f', 
                color: 'white', 
                border: 'none', 
                borderRadius: '25px', 
                cursor: 'pointer', 
                fontWeight: 'bold', 
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.backgroundColor = '#b71c1c'; 
                e.currentTarget.style.transform = 'scale(1.02)'; 
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.backgroundColor = '#d32f2f'; 
                e.currentTarget.style.transform = 'scale(1)'; 
              }}
            >
              🚨 Ingresar Dirección de Emergencia
            </button>
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
                e.currentTarget.style.backgroundColor = '#b71c1c'; 
                e.currentTarget.style.transform = 'scale(1.02)'; 
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.backgroundColor = '#d32f2f'; 
                e.currentTarget.style.transform = 'scale(1)'; 
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