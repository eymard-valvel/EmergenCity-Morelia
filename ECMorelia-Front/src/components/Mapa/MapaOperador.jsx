import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWR1YXJkbzI1MGplbW0iLCJhIjoiY2xwYzVvdzc3MDNlYjJoazUzbzZsYjRwNiJ9.KsDXLdjWn2R4fMX-YIIU8g';

const injectStyles = () => {
  const css = `
  .map-root { height:100vh; display:flex; flex-direction:column; background:#0a0f18; color:#fff; font-family:Inter, Roboto; }
  .map-container { flex:1; position:relative; }
  .top-bar { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#0b1722; border-bottom:1px solid rgba(255,255,255,0.05); }
  .speed-box { background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; font-weight:700; }
  .controls { display:flex; gap:10px; padding:10px; background:#081018; border-top:1px solid rgba(255,255,255,0.04); align-items:center; }
  .btn { padding:10px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:700; color:#fff; }
  .btn-danger { background:#ff5252; }
  .btn-primary { background:#1f7bd3; }
  .btn-warning { background:#ff9800; }
  .btn-success { background:#4caf50; }
  .btn:disabled { background:#666; cursor:not-allowed; opacity:0.6; }
  .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:90; }
  .modal { background:#09141c; padding:18px; border-radius:10px; width:min(700px,95%); }
  .input, select { width:100%; padding:10px; border-radius:8px; background:#061018; border:1px solid rgba(255,255,255,0.06); color:#fff; }
  .hospital-item { display:flex; justify-content:space-between; padding:8px; border-radius:8px; background:rgba(255,255,255,0.04); margin-bottom:6px; }
  .notify { position:fixed; bottom:20px; right:20px; background:#1a3a26; color:#fff; padding:14px 20px; border-radius:10px; font-weight:700; box-shadow:0 8px 20px rgba(0,0,0,0.6); z-index:200; opacity:0; transform:translateY(30px); transition:all .4s ease; }
  .notify.show { opacity:1; transform:translateY(0); }
  .ambulance-marker { width:56px; height:56px; display:flex; align-items:center; justify-content:center; }
  .ambulance-marker svg { filter:drop-shadow(0 6px 12px rgba(0,0,0,0.6)); transition:transform 300ms linear; }
  .route-info { position:absolute; top:80px; left:20px; background:rgba(11,23,34,0.95); padding:15px; border-radius:8px; color:white; z-index:1; max-width:300px; border:2px solid #00FFFC; box-shadow:0 0 20px rgba(0, 255, 252, 0.5); }
  .glowing-route { animation: glow 1.5s ease-in-out infinite alternate; }
  .notification-alert { position:fixed; top:20px; right:20px; background:#1a3a26; color:#fff; padding:14px 20px; border-radius:10px; font-weight:700; box-shadow:0 8px 20px rgba(0,0,0,0.6); z-index:200; opacity:0; transform:translateX(100px); transition:all .4s ease; }
  .notification-alert.show { opacity:1; transform:translateX(0); }
  .hospital-status { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:8px; }
  .hospital-status.connected { background:#4caf50; }
  .hospital-status.disconnected { background:#ff5252; }
  .connection-status { position:absolute; top:10px; right:10px; background:rgba(11,23,34,0.9); padding:8px 12px; border-radius:6px; font-size:12px; z-index:1; }
  .connection-status.connected { border-left:3px solid #4caf50; }
  .connection-status.disconnected { border-left:3px solid #ff5252; }
  @keyframes glow {
    from { box-shadow: 0 0 10px #00FFFC, 0 0 20px #00FFFC; }
    to { box-shadow: 0 0 15px #00FFFC, 0 0 30px #00FFFC, 0 0 40px #00FFFC; }
  }
  `;
  if (!document.getElementById('map-style')) {
    const s = document.createElement('style');
    s.id = 'map-style';
    s.innerHTML = css;
    document.head.appendChild(s);
  }
};

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const bearing = (lat1, lon1, lat2, lon2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const ambulanceMarker = () => {
  const div = document.createElement('div');
  div.className = 'ambulance-marker';
  div.innerHTML = `
    <svg width="56" height="56" viewBox="0 0 64 64">
      <g transform="translate(32,32)">
        <path d="M0 -24 L22 18 L-22 18 Z" fill="#ff4444" stroke="#fff" stroke-width="2"/>
        <circle cx="0" cy="-6" r="4" fill="#fff"/>
        <path d="M-6 -16 L0 -24 L6 -16" fill="rgba(255,255,255,0.15)"/>
      </g>
    </svg>`;
  return div;
};

export default function MapaOperador() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const directions = useRef(null);
  const marker = useRef(null);
  const watchId = useRef(null);
  const prev = useRef(null);
  const hospitalMarkersRef = useRef([]);
  const routeLayerIdsRef = useRef([]);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const [pos, setPos] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [isNav, setIsNav] = useState(false);
  const [dest, setDest] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [notify, setNotify] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);
  const [hospitalNotification, setHospitalNotification] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');

  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [type, setType] = useState('');
  const [hospitalsList, setHospitalsList] = useState([]);
  const [selected, setSelected] = useState('');

  useEffect(() => injectStyles(), []);

  // WebSocket mejorado con reconexión automática
  const connectWebSocket = () => {
    try {
      console.log('🔗 Conectando al WebSocket...');
      setConnectionStatus('Conectando...');
      
      ws.current = new WebSocket('ws://localhost:3002/ws');
      
      ws.current.onopen = () => {
        console.log('✅ Operador conectado al servidor WebSocket');
        setWsConnected(true);
        setConnectionStatus('Conectado');
        
        // Registrar ambulancia
        ws.current.send(JSON.stringify({
          type: 'register_ambulance',
          ambulance: {
            id: 'UVI-01',
            placa: 'ABC123',
            tipo: 'UVI Móvil',
            status: 'disponible'
          }
        }));

        setNotify('✅ Conectado al servidor');
        setTimeout(() => setNotify(''), 3000);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Mensaje recibido en operador:', data.type);
          
          switch (data.type) {
            case 'connection_established':
              console.log('✅ Conexión WebSocket confirmada');
              setNotify('✅ Conexión establecida con servidor');
              setTimeout(() => setNotify(''), 3000);
              break;
              
            case 'active_hospitals_update':
              console.log('🏥 Hospitales activos actualizados:', data.hospitals);
              setHospitalsList(data.hospitals || []);
              
              // Si el mapa está listo, actualizar marcadores
              if (map.current) {
                updateHospitalMarkers(data.hospitals || []);
              }
              
              if (data.hospitals && data.hospitals.length > 0) {
                setNotify(`🏥 ${data.hospitals.length} hospitales conectados`);
                setTimeout(() => setNotify(''), 3000);
              }
              break;
              
            case 'hospital_note':
              setNotify(`📝 Nota del hospital: ${data.note?.message || 'Mensaje recibido'}`);
              setTimeout(() => setNotify(''), 5000);
              break;
              
            case 'patient_accepted':
              setHospitalNotification({
                type: 'accepted',
                message: `✅ ${data.hospitalInfo?.nombre || 'Hospital'} ha aceptado al paciente`,
                hospitalInfo: data.hospitalInfo
              });
              setTimeout(() => setHospitalNotification(null), 5000);
              break;
              
            case 'patient_rejected':
              setHospitalNotification({
                type: 'rejected',
                message: `❌ ${data.hospitalInfo?.nombre || 'Hospital'} no puede aceptar al paciente. Razón: ${data.reason}`,
                hospitalInfo: data.hospitalInfo
              });
              setTimeout(() => setHospitalNotification(null), 5000);
              break;

            case 'notification_sent':
              setNotify(`📋 ${data.message || 'Notificación enviada al hospital'}`);
              setTimeout(() => setNotify(''), 3000);
              break;
              
            case 'pong':
              // Respuesta a ping, conexión activa
              break;
              
            case 'error':
              console.error('❌ Error del servidor:', data.message);
              setNotify(`❌ Error: ${data.message}`);
              setTimeout(() => setNotify(''), 5000);
              break;
              
            default:
              console.log('📨 Mensaje recibido:', data);
          }
        } catch (error) {
          console.error('❌ Error procesando mensaje:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('🔌 WebSocket cerrado:', event.code, event.reason);
        setWsConnected(false);
        setConnectionStatus('Desconectado');
        
        if (event.code !== 1000) {
          console.log('🔄 Intentando reconexión en 3 segundos...');
          setNotify('🔌 Conexión perdida. Reconectando...');
          
          reconnectTimeout.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ Error WebSocket:', error);
        setWsConnected(false);
        setConnectionStatus('Error de conexión');
        setNotify('❌ Error de conexión con el servidor');
      };

    } catch (error) {
      console.error('❌ Error al conectar WebSocket:', error);
      setConnectionStatus('Error de conexión');
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Componente desmontado');
      }
    };
  }, []);

  // Enviar actualización de ubicación al servidor
  useEffect(() => {
    if (pos && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'location_update',
        ambulanceId: 'UVI-01',
        location: {
          lat: pos.lat,
          lng: pos.lng,
          heading: heading,
          speed: speed
        },
        speed: speed,
        status: isNav ? 'en_ruta' : 'disponible'
      }));
    }
  }, [pos, speed, heading, isNav]);

  // Función para limpiar rutas
  const clearExistingRoutes = () => {
    if (!map.current) return;
    
    routeLayerIdsRef.current.forEach(layerId => {
      const layersToRemove = [
        layerId,
        layerId + '-glow',
        layerId + '-outline'
      ];
      
      layersToRemove.forEach(layer => {
        if (map.current.getLayer(layer)) {
          map.current.removeLayer(layer);
        }
      });
      
      if (map.current.getSource(layerId)) {
        map.current.removeSource(layerId);
      }
    });
    
    routeLayerIdsRef.current = [];
    setRouteInfo(null);
  };

  // Función para trazar ruta
  const traceRoute = (startPoint, endPoint, routeId = 'ambulanceRoute') => {
    return new Promise((resolve, reject) => {
      if (!map.current) {
        reject(new Error("Mapa no está disponible"));
        return;
      }

      clearExistingRoutes();

      fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      )
        .then(response => response.json())
        .then(data => {
          if (!data.routes || data.routes.length === 0) {
            reject(new Error("No se encontró ruta"));
            return;
          }

          const calculatedRoute = data.routes[0].geometry.coordinates;
          const duration = data.routes[0].duration;
          const distance = data.routes[0].distance;

          console.log(`Ruta trazada: ${(distance / 1000).toFixed(2)} km, ${(duration / 60).toFixed(2)} min`);

          setRouteInfo({
            distance: (distance / 1000).toFixed(2),
            time: (duration / 60).toFixed(2),
            hospital: endPoint.name
          });

          const routeColor = '#00FFFC';

          map.current.addSource(routeId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: calculatedRoute,
              },
              properties: {}
            },
          });

          map.current.addLayer({
            id: routeId,
            type: 'line',
            source: routeId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': routeColor,
              'line-width': 8,
              'line-opacity': 0.95,
              'line-blur': 0.3,
            },
          });

          map.current.addLayer({
            id: routeId + '-glow',
            type: 'line',
            source: routeId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': routeColor,
              'line-width': 15,
              'line-opacity': 0.4,
              'line-blur': 1.5
            },
          }, routeId);

          map.current.addLayer({
            id: routeId + '-outline',
            type: 'line',
            source: routeId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#FFFFFF',
              'line-width': 12,
              'line-opacity': 0.2,
              'line-blur': 0.8
            },
          }, routeId + '-glow');

          routeLayerIdsRef.current = [
            routeId,
            routeId + '-glow',
            routeId + '-outline'
          ];

          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend([startPoint.lng, startPoint.lat]);
          bounds.extend([endPoint.lng, endPoint.lat]);
          
          map.current.fitBounds(bounds, {
            padding: 100,
            duration: 2000,
            pitch: 45
          });

          resolve({
            distance: (distance / 1000).toFixed(2),
            time: (duration / 60).toFixed(2),
            routeGeometry: calculatedRoute // Nueva: incluir geometría de la ruta
          });
        })
        .catch(error => {
          console.error("Error al trazar la ruta:", error);
          reject(error);
        });
    });
  };

  // Función para notificar al hospital sobre traslado
  const notifyHospital = (hospital, patientInfo, eta, distance, routeGeometry) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      
      console.log('📤 Enviando notificación al hospital:', {
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        patientInfo: patientInfo,
        eta: eta,
        distance: distance,
        hasRouteGeometry: !!routeGeometry
      });
      
      ws.current.send(JSON.stringify({
        type: 'patient_transfer_notification',
        ambulanceId: 'UVI-01',
        hospitalId: hospital.id,
        patientInfo: patientInfo,
        eta: eta,
        distance: distance,
        routeGeometry: routeGeometry // Nueva: enviar geometría de la ruta
      }));
      
      console.log(`📋 Notificación enviada al hospital: ${hospital.name}`);
    } else {
      console.error('❌ No hay conexión WebSocket para enviar notificación');
      setNotify('❌ No hay conexión con el servidor. No se pudo notificar al hospital.');
      setTimeout(() => setNotify(''), 5000);
    }
  };

  // Actualizar marcadores de hospitales dinámicamente
  const updateHospitalMarkers = (hospitals) => {
    if (!map.current) return;

    // Limpiar marcadores antiguos
    hospitalMarkersRef.current.forEach(marker => marker.remove());
    hospitalMarkersRef.current = [];

    hospitals.forEach((hospital) => {
      if (!hospital.lat || !hospital.lng) {
        console.warn('Hospital sin coordenadas:', hospital);
        return;
      }

      const hospitalEl = document.createElement('div');
      hospitalEl.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: ${hospital.connected ? '#FF4444' : '#666'};
          border: 3px solid ${hospital.connected ? 'white' : '#999'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          opacity: ${hospital.connected ? '1' : '0.6'};
        ">🏥</div>
      `;
      hospitalEl.style.cursor = hospital.connected ? 'pointer' : 'not-allowed';

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 8px; max-width: 250px;">
            <strong>${hospital.name}</strong>
            <div style="font-size: 12px; margin: 4px 0;">
              <span class="hospital-status ${hospital.connected ? 'connected' : 'disconnected'}"></span>
              ${hospital.connected ? 'Conectado' : 'Desconectado'}
            </div>
            <div style="font-size: 12px; margin: 4px 0;">📍 ${hospital.ubicacion}</div>
            ${hospital.especialidades && hospital.especialidades.length > 0 ? 
              `<div style="font-size: 11px; margin: 4px 0;">🏥 ${hospital.especialidades.join(', ')}</div>` : ''}
            ${hospital.camasDisponibles ? 
              `<div style="font-size: 11px; margin: 4px 0;">🛏️ ${hospital.camasDisponibles} camas disponibles</div>` : ''}
            ${hospital.connected ? `
            <button onclick="window.traceToHospital('${hospital.id}')" 
              style="
                margin-top: 8px;
                padding: 8px 16px;
                background: #00FFFC;
                color: black;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                box-shadow: 0 0 10px #00FFFC;
                width: 100%;
              ">
              🚑 Trazar Ruta
            </button>` : 
            '<div style="margin-top: 8px; padding: 8px; background: #666; color: white; text-align: center; border-radius: 4px; font-size: 12px;">Hospital no disponible</div>'}
          </div>
        `);

      const marker = new mapboxgl.Marker(hospitalEl)
        .setLngLat([hospital.lng, hospital.lat])
        .setPopup(popup)
        .addTo(map.current);

      hospitalMarkersRef.current.push(marker);

      if (hospital.connected) {
        hospitalEl.addEventListener('click', (e) => {
          e.stopPropagation();
          clearExistingRoutes();
          traceRoute(pos, hospital, 'hospitalRoute');
          setDest(hospital);
          setIsNav(true);
        });
      }
    });

    // Función global para trazar ruta desde popup
    window.traceToHospital = (hospitalId) => {
      const hospital = hospitals.find(h => h.id === hospitalId);
      if (hospital && hospital.connected && pos) {
        clearExistingRoutes();
        traceRoute(pos, hospital, 'hospitalRoute');
        setDest(hospital);
        setIsNav(true);
      } else if (!hospital.connected) {
        setNotify('❌ Hospital no disponible. Seleccione otro hospital.');
        setTimeout(() => setNotify(''), 3000);
      }
    };
  };

  // Solicitar lista actualizada de hospitales
  const refreshHospitalsList = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'request_hospitals_list'
      }));
      setNotify('🔄 Actualizando lista de hospitales...');
      setTimeout(() => setNotify(''), 2000);
    } else {
      setNotify('❌ No hay conexión con el servidor');
    }
  };

  // Calcular hospitales más cercanos
  const calcHospitals = () => {
    if (!pos) {
      setNotify('❌ Esperando ubicación GPS...');
      setTimeout(() => setNotify(''), 3000);
      return;
    }
    
    // Filtrar solo hospitales conectados
    const connectedHospitals = hospitalsList.filter(h => h.connected);
    
    if (connectedHospitals.length === 0) {
      setNotify('❌ No hay hospitales conectados disponibles');
      setTimeout(() => setNotify(''), 3000);
      return;
    }

    const list = connectedHospitals.map((h) => ({
      ...h,
      dist: haversine(pos.lat, pos.lng, h.lat, h.lng)
    }));
    
    list.sort((a, b) => a.dist - b.dist);
    setHospitalsList(list);
    setSelected(list[0]?.id || '');
    
    setNotify(`📍 ${list.length} hospitales conectados encontrados`);
    setTimeout(() => setNotify(''), 3000);
  };

  // Función para iniciar navegación
  const startNav = async (hospital) => {
    if (!pos || !hospital) {
      throw new Error('Ubicación u hospital no disponibles');
    }
    
    if (!hospital.connected) {
      throw new Error('Hospital no disponible. Seleccione otro hospital.');
    }
    
    setIsNav(true);
    setDest(hospital);

    // Trazar ruta visual inmediatamente
    const routeResult = await traceRoute(pos, hospital, 'ambulanceRoute');

    // Configurar directions también (como respaldo)
    const dir = directions.current;
    try { 
      dir.removeRoutes(); 
    } catch (e) {
      console.log('No routes to remove in directions');
    }

    dir.setOrigin([pos.lng, pos.lat]);
    dir.setDestination([hospital.lng, hospital.lat]);

    // Ajustar cámara para mostrar la ruta completa
    const bounds = new mapboxgl.LngLatBounds()
      .extend([pos.lng, pos.lat])
      .extend([hospital.lng, hospital.lat]);
    
    map.current.fitBounds(bounds, {
      padding: 100,
      duration: 2000,
      pitch: 45,
      bearing: heading
    });

    return routeResult;
  };

  const confirm = async () => {
    // Validaciones mejoradas con mensajes específicos
    if (!age) {
      alert('Por favor ingresa la edad del paciente.');
      return;
    }
    
    if (!sex) {
      alert('Por favor selecciona el sexo del paciente.');
      return;
    }
    
    if (!type) {
      alert('Por favor ingresa el tipo de emergencia.');
      return;
    }
    
    const hospital = hospitalsList.find((h) => h.id === selected && h.connected);
    if (!hospital) {
      alert('Por favor selecciona un hospital conectado disponible.');
      return;
    }

    if (!pos) {
      alert('No se puede obtener la ubicación actual. Esperando GPS...');
      return;
    }

    try {
      // Iniciar navegación
      const routeResult = await startNav(hospital);
      
      // Preparar información del paciente
      const patientInfo = {
        age: age,
        sex: sex,
        type: type,
        timestamp: new Date().toLocaleString()
      };

      // Enviar notificación al hospital CON LA GEOMETRÍA DE LA RUTA
      notifyHospital(
        hospital, 
        patientInfo, 
        routeResult?.time || 'Calculando...', 
        routeResult?.distance || 'Calculando...',
        routeResult?.routeGeometry // Nueva: enviar geometría de la ruta
      );

      setShowForm(false);
      setNotify(`✅ Reporte enviado a ${hospital.name}. Ruta trazada.`);
      setTimeout(() => setNotify(''), 5000);
      
      // Limpiar formulario
      setAge('');
      setSex('');
      setType('');
      setSelected('');
      
    } catch (error) {
      console.error('Error al confirmar emergencia:', error);
      alert('Error al procesar la emergencia: ' + error.message);
    }
  };

  const stopNavigation = () => {
    setIsNav(false);
    setDest(null);
    clearExistingRoutes();
    
    if (directions.current) {
      try {
        directions.current.removeRoutes();
      } catch (e) {
        console.log('Error removing routes from directions:', e);
      }
    }
    
    setNotify('❌ Navegación cancelada. Ruta eliminada.');
    setTimeout(() => setNotify(''), 3000);
  };

  // Reconectar manualmente
  const reconnectWebSocket = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    connectWebSocket();
  };

  // Mapa inicial con estilo corregido
  useEffect(() => {
    if (!mapContainer.current) return;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-101.1969, 19.7024],
      zoom: 15,
      pitch: 55,
      bearing: 0,
      antialias: true
    });

    m.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const dir = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: 'metric',
      profile: 'driving-traffic',
      interactive: false,
      controls: { inputs: false, instructions: false },
      styles: [
        {
          id: 'directions-route-line-alt',
          type: 'line',
          source: 'directions',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#00FFFC',
            'line-width': 6,
            'line-opacity': 0.9
          }
        }
      ]
    });

    m.addControl(dir, 'top-left');
    directions.current = dir;
    marker.current = new mapboxgl.Marker({ element: ambulanceMarker(), anchor: 'center' });
    map.current = m;

    m.on('load', () => {
      console.log('🗺️ Mapa cargado correctamente');
      
      // Agregar capa de edificios 3D si existe en este estilo
      const layers = m.getStyle().layers;
      const labelLayerId = layers.find((l) => l.type === 'symbol' && l.layout['text-field'])?.id;
      
      if (m.getSource('composite')) {
        m.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.6
          }
        }, labelLayerId);
      }
    });

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      hospitalMarkersRef.current.forEach(marker => marker.remove());
      hospitalMarkersRef.current = [];
      try { m.remove(); } catch {}
    };
  }, []);

  // GPS en tiempo real
  useEffect(() => {
    if (!navigator.geolocation) {
      setNotify('❌ Geolocalización no soportada');
      return;
    }
    
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const { latitude, longitude, speed, heading: h } = p.coords;
        const spd = speed ? Math.round(speed * 3.6) : 0;
        let head = h || 0;
        
        if ((!h || h === 0) && prev.current)
          head = bearing(prev.current.lat, prev.current.lng, latitude, longitude);
        
        prev.current = { lat: latitude, lng: longitude };
        setPos({ lat: latitude, lng: longitude });
        setSpeed(spd);
        setHeading(Math.round(head));

        if (map.current && marker.current) {
          marker.current.setLngLat([longitude, latitude]).addTo(map.current);
          const el = marker.current.getElement().querySelector('svg');
          if (el) el.style.transform = `rotate(${head}deg)`;

          if (!isNav) {
            map.current.easeTo({
              center: [longitude, latitude],
              bearing: head,
              pitch: 55,
              zoom: spd > 60 ? 14 : 17,
              duration: 1000
            });
          }

          if (isNav && directions.current && dest) {
            directions.current.setOrigin([longitude, latitude]);
            if (routeLayerIdsRef.current.length > 0) {
              traceRoute({ lat: latitude, lng: longitude }, dest, 'ambulanceRoute');
            }
          }
        }
      },
      (err) => {
        console.error('GPS error:', err);
        setNotify('❌ Error de GPS');
        setTimeout(() => setNotify(''), 3000);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
    
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [isNav, dest]);

  return (
    <div className="map-root">
      {/* Indicador de estado de conexión */}
      <div className={`connection-status ${wsConnected ? 'connected' : 'disconnected'}`}>
        {wsConnected ? '✅ Conectado' : '❌ Desconectado'} | {connectionStatus}
        {!wsConnected && (
          <button 
            onClick={reconnectWebSocket}
            style={{
              marginLeft: '10px',
              padding: '4px 8px',
              background: '#ff9800',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            🔄 Reconectar
          </button>
        )}
      </div>

      <div className="top-bar">
        <div>
          <div style={{ fontWeight: 800 }}>🚑 Ambulancia UVI-01</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Estado: {isNav ? `En ruta a ${dest?.name || 'hospital'}` : 'Disponible'}
            {hospitalsList.length > 0 && (
              <span> • {hospitalsList.filter(h => h.connected).length} hospitales conectados</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="speed-box">{speed} km/h</div>
          <div style={{ opacity: 0.7 }}>{heading}°</div>
          {isNav && (
            <button 
              className="btn" 
              style={{ background: '#ff5252', padding: '6px 12px', fontSize: '12px' }}
              onClick={stopNavigation}
            >
              Cancelar Ruta
            </button>
          )}
        </div>
      </div>

      <div ref={mapContainer} className="map-container" />

      {/* Información de la ruta */}
      {routeInfo && (
        <div className="route-info glowing-route">
          <div style={{ fontWeight: 800, marginBottom: '8px', color: '#00FFFC' }}>
            📊 RUTA ACTIVA
          </div>
          <div>🏥 <strong>{routeInfo.hospital}</strong></div>
          <div>📏 <strong>{routeInfo.distance} km</strong></div>
          <div>⏱️ <strong>{routeInfo.time} min</strong></div>
        </div>
      )}

      {/* Notificación del hospital */}
      {hospitalNotification && (
        <div className="notification-alert show" style={{ 
          background: hospitalNotification.type === 'accepted' ? '#1a3a26' : '#3a1a1a'
        }}>
          {hospitalNotification.message}
        </div>
      )}

      <div className="controls">
        <button 
          className="btn btn-danger" 
          onClick={() => { setShowForm(true); calcHospitals(); }}
          disabled={!wsConnected}
        >
          ⚠️ EMERGENCIA
        </button>
        <button
          className="btn btn-warning"
          onClick={refreshHospitalsList}
          disabled={!wsConnected}
        >
          🔄 Actualizar Hospitales
        </button>
        <button
          className="btn btn-success"
          onClick={reconnectWebSocket}
        >
          🔌 {wsConnected ? 'Conexión OK' : 'Reconectar'}
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (pos)
              map.current.flyTo({ 
                center: [pos.lng, pos.lat], 
                zoom: 17, 
                pitch: 55, 
                bearing: heading,
                duration: 1500 
              });
          }}
        >
          🎯 Centrar
        </button>
      </div>

      {showForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 style={{ marginBottom: 10, color: '#ff5252' }}>🚨 Reporte de Emergencia</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input 
                className="input" 
                type="number" 
                placeholder="Edad" 
                value={age} 
                onChange={(e) => setAge(e.target.value)} 
              />
              <select 
                className="input" 
                value={sex} 
                onChange={(e) => setSex(e.target.value)}
              >
                <option value="">Sexo</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
              <input 
                className="input" 
                placeholder="Tipo de emergencia" 
                value={type} 
                onChange={(e) => setType(e.target.value)} 
              />
              <button 
                className="btn btn-primary" 
                onClick={calcHospitals}
                disabled={!wsConnected}
              >
                📍 Buscar hospitales
              </button>
            </div>
            <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto' }}>
              {hospitalsList.filter(h => h.connected).map((h) => (
                <div key={h.id} className="hospital-item">
                  <div>
                    <b>{h.name}</b>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {h.dist ? `${h.dist.toFixed(2)} km` : 'Calculando...'} 
                      {h.camasDisponibles > 0 && ` • ${h.camasDisponibles} camas`}
                    </div>
                    {h.especialidades && h.especialidades.length > 0 && (
                      <div style={{ fontSize: 11, opacity: 0.6 }}>
                        {h.especialidades.slice(0, 2).join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn"
                    style={{ 
                      background: selected === h.id ? '#1976d2' : 'transparent', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '12px',
                      padding: '6px 10px'
                    }}
                    onClick={() => {
                      setSelected(h.id);
                      if (pos) {
                        const hospital = hospitalsList.find(hos => hos.id === h.id);
                        if (hospital) {
                          clearExistingRoutes();
                          traceRoute(pos, hospital, 'previewRoute');
                          setNotify(`📍 Vista previa: ${hospital.name}`);
                          setTimeout(() => setNotify(''), 3000);
                        }
                      }
                    }}
                  >
                    {selected === h.id ? 'Seleccionado' : 'Seleccionar'}
                  </button>
                </div>
              ))}
              {hospitalsList.filter(h => h.connected).length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  {wsConnected ? 'No hay hospitales conectados disponibles' : 'Sin conexión al servidor'}
                </div>
              )}
            </div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn" onClick={() => {
                setShowForm(false);
                clearExistingRoutes();
              }}>Cancelar</button>
              <button 
                className="btn btn-danger" 
                onClick={confirm}
                disabled={!wsConnected || !selected}
              >
                Confirmar y Trazar Ruta
              </button>
            </div>
          </div>
        </div>
      )}

      {notify && <div className={`notify ${notify ? 'show' : ''}`}>{notify}</div>}
    </div>
  );
}