import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWR1IjoiZWR1YXJkbzI1MGplbW0iLCJhIjoiY2xwYzVvdzc3MDNlYjJoazUzbzZsYjRwNiJ9.KsDXLdjWn2R4fMX-YIIU8g';

const hospitals = [
  { id: 'h1', name: 'Hospital Star Medica', lng: -101.191438, lat: 19.682937 },
  { id: 'h2', name: 'IMSS Hospital General Zona 83 Morelia', lng: -101.17451, lat: 19.68219 },
  { id: 'h3', name: 'IMSS Hospital General Regional 1 Charo', lng: -101.09293, lat: 19.72438 },
  { id: 'h4', name: 'Clínica ISSSTE', lng: -101.18061, lat: 19.72833 },
  { id: 'h5', name: 'Hospital Acueducto S.A. de C.V.', lng: -101.172244, lat: 19.697744 },
  { id: 'h6', name: 'Hospital Regional Patzcuaro', lng: -101.606262, lat: 19.515874 }
];

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
  const routeLayerIdsRef = useRef([]); // Cambiado a array para manejar múltiples capas

  const [pos, setPos] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [isNav, setIsNav] = useState(false);
  const [dest, setDest] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [notify, setNotify] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);

  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [type, setType] = useState('');
  const [hospitalsList, setHospitalsList] = useState([]);
  const [selected, setSelected] = useState('');

  useEffect(() => injectStyles(), []);

  // Función MEJORADA para limpiar TODAS las rutas existentes
  const clearExistingRoutes = () => {
    if (!map.current) return;
    
    // Limpiar todas las capas de ruta
    routeLayerIdsRef.current.forEach(layerId => {
      // Remover capas principales y sus efectos
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
      
      // Remover fuentes
      if (map.current.getSource(layerId)) {
        map.current.removeSource(layerId);
      }
    });
    
    routeLayerIdsRef.current = [];
    setRouteInfo(null);
  };

  // Función MEJORADA para trazar ruta visual
  const traceRoute = (startPoint, endPoint, routeId = 'ambulanceRoute') => {
    if (!map.current) {
      console.warn("Mapa no está disponible");
      return;
    }

    // Limpiar rutas existentes primero
    clearExistingRoutes();

    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
    )
      .then(response => response.json())
      .then(data => {
        if (!data.routes || data.routes.length === 0) {
          console.error("No se encontró ruta");
          return;
        }

        const calculatedRoute = data.routes[0].geometry.coordinates;
        const duration = data.routes[0].duration;
        const distance = data.routes[0].distance;

        console.log(`Ruta trazada: ${(distance / 1000).toFixed(2)} km, ${(duration / 60).toFixed(2)} min`);

        // Actualizar información de la ruta
        setRouteInfo({
          distance: (distance / 1000).toFixed(2),
          time: (duration / 60).toFixed(2),
          hospital: endPoint.name
        });

        // COLOR CIAN FOSFORECENTE - Muy llamativo y visible
        const routeColor = '#00FFFC';

        // Crear fuente GeoJSON
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

        // Crear capa de línea principal
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

        // Agregar efecto de brillo exterior
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

        // Agregar efecto de contorno brillante
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

        // Guardar IDs de las capas creadas
        routeLayerIdsRef.current = [
          routeId,
          routeId + '-glow',
          routeId + '-outline'
        ];

        // Ajustar el mapa para mostrar la ruta completa
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([startPoint.lng, startPoint.lat]);
        bounds.extend([endPoint.lng, endPoint.lat]);
        
        map.current.fitBounds(bounds, {
          padding: 100,
          duration: 2000,
          pitch: 45
        });

      })
      .catch(error => console.error("Error al trazar la ruta:", error));
  };

  // Función MEJORADA para crear marcadores de hospitales
  const createHospitalMarkers = () => {
    if (!map.current || hospitalMarkersRef.current.length > 0) return;

    hospitals.forEach((hospital) => {
      const hospitalEl = document.createElement('div');
      hospitalEl.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: #FF4444;
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">🏥</div>
      `;
      hospitalEl.style.cursor = 'pointer';

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 8px;">
            <strong>${hospital.name}</strong>
            <br/>
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
              ">
              🚑 Trazar Ruta
            </button>
          </div>
        `);

      const marker = new mapboxgl.Marker(hospitalEl)
        .setLngLat([hospital.lng, hospital.lat])
        .setPopup(popup)
        .addTo(map.current);

      hospitalMarkersRef.current.push(marker);

      // Click handler MEJORADO para trazar ruta al hospital
      hospitalEl.addEventListener('click', (e) => {
        e.stopPropagation();
        // Limpiar ruta anterior y trazar nueva
        clearExistingRoutes();
        traceRoute(pos, hospital, 'hospitalRoute');
        setDest(hospital);
        setIsNav(true);
      });
    });

    // Exponer función global MEJORADA para el popup
    window.traceToHospital = (hospitalId) => {
      const hospital = hospitals.find(h => h.id === hospitalId);
      if (hospital && pos) {
        // Limpiar ruta anterior y trazar nueva
        clearExistingRoutes();
        traceRoute(pos, hospital, 'hospitalRoute');
        setDest(hospital);
        setIsNav(true);
      }
    };
  };

  // Mapa inicial
  useEffect(() => {
    if (!mapContainer.current) return;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [-101.1969, 19.7024],
      zoom: 15,
      pitch: 55,
      bearing: 0,
      antialias: true
    });

    m.on('load', () => {
      // Edificios 3D
      const layers = m.getStyle().layers;
      const labelLayerId = layers.find((l) => l.type === 'symbol' && l.layout['text-field'])?.id;
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

      // Crear marcadores de hospitales después de que el mapa cargue
      setTimeout(() => {
        createHospitalMarkers();
      }, 1000);
    });

    // Cielo y controles
    m.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Dirección con estilo personalizado para ruta CIAN
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

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      hospitalMarkersRef.current.forEach(marker => marker.remove());
      hospitalMarkersRef.current = [];
      try { m.remove(); } catch {}
    };
  }, []);

  // GPS en tiempo real
  useEffect(() => {
    if (!navigator.geolocation) return;
    
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
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
    
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [isNav, dest]);

  const calcHospitals = () => {
    if (!pos) return;
    const list = hospitals.map((h) => ({
      ...h,
      dist: haversine(pos.lat, pos.lng, h.lat, h.lng)
    }));
    list.sort((a, b) => a.dist - b.dist);
    setHospitalsList(list);
    setSelected(list[0]?.id || '');
  };

  // Función MEJORADA para iniciar navegación
  const startNav = async (hospital) => {
    if (!pos || !hospital) return;
    
    setIsNav(true);
    setDest(hospital);

    // Trazar ruta visual inmediatamente
    traceRoute(pos, hospital, 'ambulanceRoute');

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
  };

  const confirm = async () => {
    if (!age || !sex || !type) {
      alert('Completa todos los campos.');
      return;
    }
    
    const hospital = hospitalsList.find((h) => h.id === selected);
    if (!hospital) {
      alert('Selecciona un hospital.');
      return;
    }
    
    await startNav(hospital);
    setShowForm(false);
    setNotify(`✅ Reporte enviado a ${hospital.name}. Ruta trazada.`);
    setTimeout(() => setNotify(''), 5000);
  };

  // Función MEJORADA para cancelar navegación
  const stopNavigation = () => {
    setIsNav(false);
    setDest(null);
    clearExistingRoutes(); // Esto ahora limpia TODAS las rutas correctamente
    
    // También limpiar directions
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

  return (
    <div className="map-root">
      <div className="top-bar">
        <div>
          <div style={{ fontWeight: 800 }}>🚑 Ambulancia UVI-01</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Estado: {isNav ? `En ruta a ${dest?.name || 'hospital'}` : 'Disponible'}
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

      <div className="controls">
        <button className="btn btn-danger" onClick={() => { setShowForm(true); calcHospitals(); }}>
          ⚠️ EMERGENCIA
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
              <button className="btn btn-primary" onClick={calcHospitals}>
                📍 Buscar hospitales
              </button>
            </div>
            <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto' }}>
              {hospitalsList.map((h) => (
                <div key={h.id} className="hospital-item">
                  <div>
                    <b>{h.name}</b>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{h.dist.toFixed(2)} km</div>
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
                      // Trazar ruta inmediatamente al seleccionar hospital
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
            </div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn" onClick={() => {
                setShowForm(false);
                clearExistingRoutes(); // Limpiar rutas de vista previa al cancelar
              }}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirm}>
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