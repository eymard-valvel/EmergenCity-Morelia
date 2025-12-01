// websocket-server-optimized.js - VERSIÓN SIMPLIFICADA
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const { PrismaClient } = require('@prisma/client');

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

const wss = new WebSocket.Server({
  server,
  path: '/ws',
  perMessageDeflate: false
});

// Almacenamiento optimizado
const activeAmbulances = new Map();
const activeHospitals = new Map();
const pendingNotifications = new Map();
const activeRoutes = new Map();

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || 'pk.eyJ1IjoiZWR1YXJkbzI1MGplbW0iLCJhIjoiY2xwYzVvdzc3MDNlYjJoazUzbzZsYjRwNiJ9.KsDXLdjWn2R4fMX-YIIU8g';

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});
app.options('*', (req, res) => res.sendStatus(200));

// ---------- CONSULTA DE HOSPITALES DESDE PRISMA (SIMPLIFICADO) ----------
async function getAllHospitalsFromDB() {
  try {
    const hospitals = await prisma.hospitales.findMany({
      select: {
        id_hospitales: true,
        nombre: true,
        direccion: true
        // Solo estos campos existen según tu modelo
      }
      // Traemos TODOS los hospitales
    });

    return hospitals.map(hospital => ({
      id: hospital.id_hospitales.toString(),
      nombre: hospital.nombre || `Hospital ${hospital.id_hospitales}`,
      direccion: hospital.direccion || '',
      lat: 19.7024, // Valor por defecto
      lng: -101.1969, // Valor por defecto
      especialidades: ['General'], // Por defecto ya que no hay en BD
      camasDisponibles: 10, // Por defecto ya que no hay en BD
      telefono: '', // Por defecto ya que no hay en BD
      activo: true, // Por defecto ya que no hay campo activo en BD
      connected: false, // Inicialmente desconectado (WebSocket)
      db_activo: true // Por defecto
    }));
  } catch (error) {
    console.error('❌ Error consultando hospitales desde DB:', error);
    return [];
  }
}

// ---------- GEOCODING MEJORADO PARA MORELIA ----------
async function geocodeAddressMorelia(address) {
  if (!address || address.trim() === '') {
    console.log('❌ Dirección vacía');
    return null;
  }

  try {
    const q = encodeURIComponent(address.trim() + ', Morelia, Michoacán, México');
    console.log(`📍 Geocoding: ${address}`);
    
    // Mapbox con bounding box para Morelia
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${MAPBOX_TOKEN}&country=mx&limit=10&bbox=-101.2676,19.6410,-101.1262,19.7638&proximity=-101.1969,19.7024`;
    
    const mapboxResp = await fetch(mapboxUrl);
    if (mapboxResp.ok) {
      const mapboxData = await mapboxResp.json();
      
      if (mapboxData.features && mapboxData.features.length > 0) {
        // Filtrar resultados dentro de Morelia y priorizar addresses
        const moreliaResults = mapboxData.features.filter(f => 
          f.place_type.includes('address') || 
          f.relevance > 0.6
        );
        
        const bestMatch = moreliaResults[0] || mapboxData.features[0];
        
        if (bestMatch) {
          const result = {
            lat: bestMatch.center[1],
            lng: bestMatch.center[0],
            place_name: bestMatch.place_name,
            relevance: bestMatch.relevance,
            type: bestMatch.place_type[0],
            address: bestMatch.properties?.address || '',
            source: 'mapbox',
            raw: bestMatch
          };
          
          console.log(`✅ Geocoding exitoso: ${result.place_name}`);
          return result;
        }
      }
    }

    console.log('❌ No se pudo geocodificar la dirección en Morelia');
    return null;

  } catch (error) {
    console.error('💥 Error en geocoding:', error);
    return null;
  }
}

// ---------- SEARCH ADDRESSES MEJORADO ----------
async function searchAddressesMorelia(query) {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const q = encodeURIComponent(query.trim());
    
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${MAPBOX_TOKEN}&country=mx&limit=10&types=address,poi,place&bbox=-101.2676,19.6410,-101.1262,19.7638&language=es`;
    
    console.log(`🔍 Buscando direcciones: ${query}`);
    
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) return [];
    
    // Filtrar y priorizar resultados relevantes
    const filteredResults = data.features
      .filter(feature => {
        const isAddress = feature.place_type.includes('address');
        const isPOI = feature.place_type.includes('poi');
        const isPlace = feature.place_type.includes('place');
        const hasHighRelevance = feature.relevance > 0.5;
        const isInMorelia = feature.place_name.toLowerCase().includes('morelia') || 
                           feature.context?.some(ctx => ctx.text.toLowerCase().includes('morelia'));
        
        return (isAddress || isPOI || isPlace) && (hasHighRelevance || isInMorelia);
      })
      .map(feature => ({
        id: feature.id,
        place_name: feature.place_name,
        lat: feature.center[1],
        lng: feature.center[0],
        type: feature.place_type[0],
        address: feature.properties?.address || '',
        relevance: feature.relevance,
        context: feature.context?.map(ctx => ctx.text).join(', ') || ''
      }))
      .sort((a, b) => b.relevance - a.relevance);

    console.log(`✅ ${filteredResults.length} resultados encontrados para: ${query}`);
    return filteredResults;
    
  } catch (error) {
    console.error('Error en búsqueda de direcciones:', error);
    return [];
  }
}

// ---------- DIRECTIONS CON VALIDACIÓN ----------
async function getDirectionsWithTraffic(startLng, startLat, endLng, endLat) {
  try {
    // Validar coordenadas dentro de Morelia
    const isInMorelia = (lng, lat) => 
      lng >= -101.2676 && lng <= -101.1262 && 
      lat >= 19.6410 && lat <= 19.7638;
    
    if (!isInMorelia(startLng, startLat) || !isInMorelia(endLng, endLat)) {
      console.log('⚠️ Coordenadas fuera de Morelia');
      return null;
    }

    const coords = `${startLng},${startLat};${endLng},${endLat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;
    
    console.log(`🛣️ Calculando ruta: ${coords}`);
    
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    
    const json = await resp.json();
    
    if (!json.routes || json.routes.length === 0) {
      console.log('❌ No se encontraron rutas');
      return null;
    }

    const route = json.routes[0];
    
    const result = {
      geometry: route.geometry.coordinates,
      distance: route.distance,
      duration: route.duration,
      summary: `${(route.distance / 1000).toFixed(1)} km, ${Math.round(route.duration / 60)} min`
    };

    console.log(`✅ Ruta calculada: ${result.summary}`);
    return result;

  } catch (error) {
    console.error('💥 Error calculando ruta:', error);
    return null;
  }
}

// ---------- FUNCIÓN PARA ENVÍO AUTOMÁTICO A SIGUIENTE HOSPITAL ----------
async function sendToNextAvailableHospital(ambulanceId, patientInfo, ambulanceLocation, originalHospitalId) {
  const hospitalsList = Array.from(activeHospitals.values())
    .filter(hospital => 
      hospital.info.id !== originalHospitalId && 
      hospital.ws && 
      hospital.ws.readyState === WebSocket.OPEN
    )
    .sort((a, b) => {
      const distA = calculateDistance(
        ambulanceLocation.lat, ambulanceLocation.lng,
        a.info.lat, a.info.lng
      );
      const distB = calculateDistance(
        ambulanceLocation.lat, ambulanceLocation.lng,
        b.info.lat, b.info.lng
      );
      return distA - distB;
    });

  if (hospitalsList.length === 0) {
    console.log('❌ No hay hospitales disponibles para envío automático');
    return null;
  }

  const nextHospital = hospitalsList[0];
  console.log(`🔄 Enviando automáticamente a hospital: ${nextHospital.info.nombre}`);

  const route = await getDirectionsWithTraffic(
    ambulanceLocation.lng,
    ambulanceLocation.lat,
    nextHospital.info.lng,
    nextHospital.info.lat
  );

  const notificationId = `auto_${Date.now()}`;
  
  const payload = {
    type: 'patient_transfer_notification',
    notificationId: notificationId,
    ambulanceId: ambulanceId,
    hospitalId: nextHospital.info.id,
    patientInfo: patientInfo,
    ambulanceLocation: ambulanceLocation,
    eta: route ? Math.round(route.duration / 60) : null,
    distance: route ? (route.distance / 1000).toFixed(1) : null,
    routeGeometry: route ? route.geometry : null,
    rawDistance: route ? route.distance : null,
    rawDuration: route ? route.duration : null,
    timestamp: new Date().toISOString(),
    status: 'pending',
    isAutomatic: true
  };

  pendingNotifications.set(notificationId, payload);

  if (nextHospital.ws && nextHospital.ws.readyState === WebSocket.OPEN) {
    sendMessage(nextHospital.ws, payload);
    console.log(`📩 Notificación automática enviada a hospital ${nextHospital.info.id}`);
  }

  const ambulance = activeAmbulances.get(ambulanceId);
  if (ambulance && ambulance.ws) {
    sendMessage(ambulance.ws, {
      type: 'automatic_redirect',
      originalHospitalId: originalHospitalId,
      newHospitalId: nextHospital.info.id,
      hospitalInfo: nextHospital.info,
      message: `Solicitud enviada automáticamente a ${nextHospital.info.nombre}`
    });
  }

  return nextHospital.info.id;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ---------- FUNCIONES DE BROADCAST MEJORADAS ----------
function broadcastToHospitals(message) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  activeHospitals.forEach((hospital) => {
    if (hospital.ws && hospital.ws.readyState === WebSocket.OPEN) {
      try {
        hospital.ws.send(messageStr);
        sentCount++;
      } catch (e) {
        console.error('Error enviando a hospital:', hospital.info.id, e);
      }
    }
  });
  
  console.log(`📤 Broadcast a ${sentCount} hospitales: ${message.type}`);
}

function broadcastToAmbulances(message) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  activeAmbulances.forEach((ambulance) => {
    if (ambulance.ws && ambulance.ws.readyState === WebSocket.OPEN) {
      try {
        ambulance.ws.send(messageStr);
        sentCount++;
      } catch (e) {
        console.error('Error enviando a ambulancia:', ambulance.id, e);
      }
    }
  });
  
  console.log(`📤 Broadcast a ${sentCount} ambulancias: ${message.type}`);
}

function broadcastActiveHospitals() {
  const hospitalsList = Array.from(activeHospitals.values()).map(hospital => ({
    id: hospital.info.id,
    nombre: hospital.info.nombre,
    lat: hospital.info.lat,
    lng: hospital.info.lng,
    direccion: hospital.info.direccion,
    especialidades: hospital.info.especialidades || ['General'],
    camasDisponibles: hospital.info.camasDisponibles || 10,
    telefono: hospital.info.telefono || '',
    connected: true,
    status: 'active',
    connectedAt: hospital.connectedAt
  }));
  
  broadcastToAmbulances({
    type: 'active_hospitals_update',
    hospitals: hospitalsList,
    timestamp: new Date().toISOString()
  });
}

function broadcastActiveAmbulances() {
  const ambulancesList = Array.from(activeAmbulances.values()).map(ambulance => ({
    id: ambulance.id,
    placa: ambulance.placa,
    tipo: ambulance.tipo,
    status: ambulance.status,
    location: ambulance.location,
    speed: ambulance.speed,
    heading: ambulance.heading,
    lastUpdate: ambulance.lastUpdate
  }));
  
  broadcastToHospitals({
    type: 'active_ambulances_update', 
    ambulances: ambulancesList,
    timestamp: new Date().toISOString()
  });
}

// ---------- HTTP ENDPOINTS ----------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeAmbulances: activeAmbulances.size,
    activeHospitals: activeHospitals.size,
    pendingNotifications: pendingNotifications.size,
    activeRoutes: activeRoutes.size,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para obtener TODOS los hospitales (conectados y desconectados)
app.get('/api/all-hospitals', async (req, res) => {
  try {
    const hospitalsFromDB = await getAllHospitalsFromDB();
    
    // Geocodificar hospitales para obtener coordenadas
    const hospitalsWithCoords = await Promise.all(
      hospitalsFromDB.map(async (hospital) => {
        if (hospital.direccion && hospital.direccion.trim() !== '') {
          const geoResult = await geocodeAddressMorelia(hospital.direccion);
          if (geoResult) {
            hospital.lat = geoResult.lat;
            hospital.lng = geoResult.lng;
          }
        }
        return hospital;
      })
    );
    
    // Marcamos cuáles están conectados actualmente vía WebSocket
    const hospitalsWithStatus = hospitalsWithCoords.map(hospital => ({
      ...hospital,
      connected: activeHospitals.has(hospital.id),
      // Todos están activos por defecto ya que no hay campo activo en BD
      status: activeHospitals.has(hospital.id) ? 'active' : 'inactive'
    }));

    res.json({ 
      hospitals: hospitalsWithStatus,
      total: hospitalsWithStatus.length,
      connected: activeHospitals.size
    });
  } catch (error) {
    console.error('❌ Error en /api/all-hospitals:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para hospitales conectados
app.get('/api/connected-hospitals', async (req, res) => {
  try {
    const connectedHospitals = Array.from(activeHospitals.values())
      .map(hospitalData => ({
        id: hospitalData.info.id,
        nombre: hospitalData.info.nombre,
        lat: hospitalData.info.lat,
        lng: hospitalData.info.lng,
        direccion: hospitalData.info.direccion,
        especialidades: hospitalData.info.especialidades || ['General'],
        camasDisponibles: hospitalData.info.camasDisponibles || 10,
        telefono: hospitalData.info.telefono || '',
        connected: true,
        status: 'active',
        connectedAt: hospitalData.connectedAt
      }));

    res.json({ 
      hospitals: connectedHospitals,
      total: connectedHospitals.length
    });
  } catch (error) {
    console.error('❌ Error en /api/connected-hospitals:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint original para compatibilidad
app.get('/api/hospitals', async (req, res) => {
  try {
    const hospitalsFromDB = await getAllHospitalsFromDB();
    
    // Geocodificar hospitales para obtener coordenadas
    const hospitalsWithCoords = await Promise.all(
      hospitalsFromDB.map(async (hospital) => {
        if (hospital.direccion && hospital.direccion.trim() !== '') {
          const geoResult = await geocodeAddressMorelia(hospital.direccion);
          if (geoResult) {
            hospital.lat = geoResult.lat;
            hospital.lng = geoResult.lng;
          }
        }
        return hospital;
      })
    );

    res.json({ 
      hospitals: hospitalsWithCoords,
      total: hospitalsWithCoords.length,
      connected: activeHospitals.size
    });
  } catch (error) {
    console.error('❌ Error en /api/hospitals:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Se requiere la dirección' });
    }
    
    const result = await geocodeAddressMorelia(address);
    
    if (!result) {
      return res.status(404).json({ error: 'No se pudo geocodificar la dirección en Morelia' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error en /geocode:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/search-addresses', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length < 3) {
      return res.json([]);
    }
    
    const results = await searchAddressesMorelia(query);
    res.json(results);
  } catch (error) {
    console.error('Error en /search-addresses:', error);
    res.status(500).json({ error: 'Error en búsqueda' });
  }
});

app.post('/directions', async (req, res) => {
  try {
    const { startLng, startLat, endLng, endLat } = req.body;
    
    if (!startLng || !startLat || !endLng || !endLat) {
      return res.status(400).json({ error: 'Coordenadas incompletas' });
    }
    
    const result = await getDirectionsWithTraffic(startLng, startLat, endLng, endLat);
    
    if (!result) {
      return res.status(404).json({ error: 'No se pudo calcular la ruta' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error en /directions:', error);
    res.status(500).json({ error: 'Error calculando ruta' });
  }
});

// ---------- WEBSOCKET MESSAGE HANDLERS ----------
wss.on('connection', (ws, req) => {
  console.log('✅ Nueva conexión WebSocket establecida');
  
  ws.send(JSON.stringify({
    type: 'connection_established',
    message: 'Conexión WebSocket establecida correctamente',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Mensaje recibido:', data.type);
      await handleMessage(ws, data);
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
      sendError(ws, 'Formato de mensaje JSON inválido');
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 Conexión cerrada: ${code} - ${reason}`);
    cleanupDisconnectedClient(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ Error WebSocket:', error);
  });
});

async function handleMessage(ws, data) {
  switch (data.type) {
    case 'register_ambulance':
      await handleRegisterAmbulance(ws, data);
      break;
      
    case 'register_hospital':
      await handleRegisterHospital(ws, data);
      break;
      
    case 'location_update':
      handleLocationUpdate(data);
      break;
      
    case 'patient_transfer_notification':
      await handlePatientTransferNotification(data);
      break;
      
    case 'hospital_accept_patient':
      handleHospitalAcceptPatient(data);
      break;
      
    case 'hospital_reject_patient':
      handleHospitalRejectPatient(data);
      break;
      
    case 'cancel_navigation':
      handleCancelNavigation(data);
      break;
      
    case 'request_route_update':
      handleRequestRouteUpdate(ws, data);
      break;
      
    case 'hospital_note':
      handleHospitalNote(data);
      break;
      
    case 'request_hospitals_list':
      await handleRequestHospitalsList(ws);
      break;
      
    case 'get_all_hospitals':
      await handleGetAllHospitals(ws);
      break;
      
    default:
      console.log('⚠️ Mensaje no manejado:', data.type);
      break;
  }
}

// ---------- HANDLERS ESPECÍFICOS ----------
async function handleRegisterAmbulance(ws, data) {
  if (!data.ambulance || !data.ambulance.id) {
    return sendError(ws, 'Datos de ambulancia incompletos');
  }

  const ambulanceData = {
    id: data.ambulance.id,
    placa: data.ambulance.placa || 'ABC123',
    tipo: data.ambulance.tipo || 'UVI Móvil',
    status: 'disponible',
    location: null,
    speed: 0,
    heading: 0,
    ws: ws,
    lastUpdate: new Date()
  };

  activeAmbulances.set(ambulanceData.id, ambulanceData);
  console.log(`🚑 Ambulancia registrada: ${ambulanceData.id}`);

  // Enviar lista actual de hospitales conectados
  const hospitalsList = Array.from(activeHospitals.values()).map(hospital => ({
    id: hospital.info.id,
    nombre: hospital.info.nombre,
    lat: hospital.info.lat,
    lng: hospital.info.lng,
    direccion: hospital.info.direccion,
    especialidades: hospital.info.especialidades || ['General'],
    camasDisponibles: hospital.info.camasDisponibles || 10,
    telefono: hospital.info.telefono || '',
    connected: true
  }));

  sendMessage(ws, {
    type: 'active_hospitals_update',
    hospitals: hospitalsList,
    message: `${hospitalsList.length} hospitales activos`
  });

  broadcastActiveAmbulances();
}

async function handleRegisterHospital(ws, data) {
  if (!data.hospital || !data.hospital.id) {
    return sendError(ws, 'Datos de hospital incompletos');
  }

  try {
    // Primero buscar el hospital en la base de datos
    const hospitalsFromDB = await getAllHospitalsFromDB();
    const hospitalFromDB = hospitalsFromDB.find(h => h.id === data.hospital.id.toString());

    if (!hospitalFromDB) {
      console.log(`❌ Hospital ${data.hospital.id} no encontrado en base de datos`);
      return sendError(ws, 'Hospital no encontrado en el sistema');
    }

    // Combinar datos del hospital
    let hospitalData = {
      info: {
        ...hospitalFromDB,
        lat: data.hospital.lat || hospitalFromDB.lat,
        lng: data.hospital.lng || hospitalFromDB.lng,
        direccion: data.hospital.direccion || hospitalFromDB.direccion,
        nombre: data.hospital.nombre || hospitalFromDB.nombre,
        telefono: data.hospital.telefono || hospitalFromDB.telefono,
        especialidades: data.hospital.especialidades || hospitalFromDB.especialidades,
        camasDisponibles: data.hospital.camasDisponibles || hospitalFromDB.camasDisponibles,
        activo: true // Todos están activos por defecto
      },
      ws: ws,
      connectedAt: new Date().toISOString(),
      isFromDB: true
    };

    // Verificar coordenadas - geocodificar si es necesario
    if ((!hospitalData.info.lat || !hospitalData.info.lng || 
        hospitalData.info.lat === 19.7024) && hospitalData.info.direccion) {
      console.log(`📍 Geocoding para hospital: ${hospitalData.info.direccion}`);
      const geoResult = await geocodeAddressMorelia(hospitalData.info.direccion);
      
      if (geoResult) {
        hospitalData.info.lat = geoResult.lat;
        hospitalData.info.lng = geoResult.lng;
        console.log(`✅ Hospital geocoded: ${hospitalData.info.lat}, ${hospitalData.info.lng}`);
      }
    }

    activeHospitals.set(hospitalData.info.id, hospitalData);
    console.log(`🏥 Hospital registrado: ${hospitalData.info.nombre} (${hospitalData.info.id})`);

    // Enviar lista actual de ambulancias
    const ambulancesList = Array.from(activeAmbulances.values()).map(ambulance => ({
      id: ambulance.id,
      placa: ambulance.placa,
      tipo: ambulance.tipo,
      status: ambulance.status,
      location: ambulance.location,
      speed: ambulance.speed,
      heading: ambulance.heading,
      lastUpdate: ambulance.lastUpdate
    }));

    sendMessage(ws, {
      type: 'active_ambulances_update',
      ambulances: ambulancesList,
      hospitalInfo: hospitalData.info,
      message: `${ambulancesList.length} ambulancias activas`
    });

    // Broadcast a todas las ambulancias que hay un nuevo hospital activo
    broadcastActiveHospitals();

  } catch (error) {
    console.error('❌ Error en register hospital:', error);
    sendError(ws, 'Error interno del servidor');
  }
}

function handleLocationUpdate(data) {
  const ambulanceId = data.ambulanceId;
  if (!ambulanceId) return;

  const ambulance = activeAmbulances.get(ambulanceId);
  if (ambulance) {
    ambulance.location = data.location || ambulance.location;
    ambulance.speed = data.speed || ambulance.speed;
    ambulance.heading = data.heading || ambulance.heading;
    ambulance.status = data.status || ambulance.status;
    ambulance.lastUpdate = new Date();

    // Broadcast de ubicación a todos los hospitales
    broadcastToHospitals({
      type: 'location_update',
      ambulanceId: ambulanceId,
      location: ambulance.location,
      speed: ambulance.speed,
      heading: ambulance.heading,
      status: ambulance.status,
      timestamp: new Date().toISOString()
    });

    console.log(`📍 Ubicación actualizada: ${ambulanceId} - ${ambulance.speed} km/h`);
  }
}

async function handlePatientTransferNotification(data) {
  const notificationId = data.notificationId || `notif_${Date.now()}`;
  
  const payload = {
    ...data,
    notificationId: notificationId,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  pendingNotifications.set(notificationId, payload);

  // Calcular ruta si no se proporciona
  if (!data.routeGeometry && data.ambulanceLocation && data.hospitalId) {
    const hospital = activeHospitals.get(data.hospitalId);
    if (hospital && hospital.info.lat && hospital.info.lng) {
      const route = await getDirectionsWithTraffic(
        data.ambulanceLocation.lng,
        data.ambulanceLocation.lat,
        hospital.info.lng,
        hospital.info.lat
      );
      
      if (route) {
        payload.routeGeometry = route.geometry;
        payload.distance = route.distance;
        payload.duration = route.duration;
        payload.routeSummary = route.summary;

        // Guardar ruta activa
        activeRoutes.set(data.ambulanceId, {
          ambulanceId: data.ambulanceId,
          hospitalId: data.hospitalId,
          routeGeometry: route.geometry,
          distance: route.distance,
          duration: route.duration,
          updatedAt: Date.now()
        });

        // Enviar actualización de ruta al hospital
        const hospitalWs = activeHospitals.get(data.hospitalId)?.ws;
        if (hospitalWs && hospitalWs.readyState === WebSocket.OPEN) {
          sendMessage(hospitalWs, {
            type: 'route_update',
            ambulanceId: data.ambulanceId,
            routeGeometry: route.geometry,
            distance: route.distance,
            duration: route.duration
          });
        }
      }
    }
  }

  // Enviar notificación al hospital específico
  if (data.hospitalId) {
    const hospital = activeHospitals.get(data.hospitalId);
    if (hospital && hospital.ws && hospital.ws.readyState === WebSocket.OPEN) {
      sendMessage(hospital.ws, {
        type: 'patient_transfer_notification',
        ...payload
      });
      console.log(`📩 Notificación enviada a hospital ${data.hospitalId}`);
    } else {
      console.log(`❌ Hospital ${data.hospitalId} no encontrado o desconectado`);
    }
  }

  // Confirmar al operador
  const ambulance = activeAmbulances.get(data.ambulanceId);
  if (ambulance && ambulance.ws) {
    sendMessage(ambulance.ws, {
      type: 'notification_sent',
      notificationId: notificationId,
      hospitalId: data.hospitalId,
      message: 'Notificación enviada correctamente'
    });
  }
}

function handleHospitalAcceptPatient(data) {
  const notification = pendingNotifications.get(data.notificationId);
  if (!notification) return;

  const ambulance = activeAmbulances.get(notification.ambulanceId);
  if (ambulance && ambulance.ws) {
    sendMessage(ambulance.ws, {
      type: 'patient_accepted',
      notificationId: data.notificationId,
      hospitalId: data.hospitalId,
      hospitalInfo: data.hospitalInfo,
      message: 'Hospital ha aceptado al paciente. Proceda con el traslado.',
      timestamp: new Date().toISOString()
    });
    
    // Establecer ruta activa
    ambulance.status = 'en_ruta';
    console.log(`✅ Paciente aceptado por hospital ${data.hospitalId}`);
  }

  pendingNotifications.delete(data.notificationId);
  broadcastActiveAmbulances();
}

function handleHospitalRejectPatient(data) {
  const notification = pendingNotifications.get(data.notificationId);
  if (!notification) return;

  const ambulance = activeAmbulances.get(notification.ambulanceId);
  if (ambulance && ambulance.ws) {
    sendMessage(ambulance.ws, {
      type: 'patient_rejected',
      notificationId: data.notificationId,
      hospitalId: data.hospitalId,
      reason: data.reason || 'No especificado',
      message: 'Hospital no puede aceptar al paciente. Buscando otro hospital...',
      timestamp: new Date().toISOString()
    });
    
    // Cancelar ruta activa
    ambulance.status = 'disponible';
    activeRoutes.delete(notification.ambulanceId);
    console.log(`❌ Paciente rechazado por hospital ${data.hospitalId}`);
  }

  // Intentar enviar automáticamente al siguiente hospital
  if (notification.ambulanceLocation && notification.patientInfo) {
    setTimeout(async () => {
      const nextHospitalId = await sendToNextAvailableHospital(
        notification.ambulanceId,
        notification.patientInfo,
        notification.ambulanceLocation,
        data.hospitalId
      );
      
      if (nextHospitalId) {
        console.log(`✅ Solicitud enviada automáticamente a hospital ${nextHospitalId}`);
      }
    }, 1000);
  }

  pendingNotifications.delete(data.notificationId);
  broadcastActiveAmbulances();
}

function handleCancelNavigation(data) {
  const { ambulanceId, hospitalId } = data;
  
  console.log(`🛑 Cancelando navegación: ambulancia ${ambulanceId}, hospital ${hospitalId}`);
  
  const ambulance = activeAmbulances.get(ambulanceId);
  if (ambulance) {
    ambulance.status = 'disponible';
  }
  
  activeRoutes.delete(ambulanceId);
  
  pendingNotifications.forEach((notif, id) => {
    if (notif.ambulanceId === ambulanceId && notif.hospitalId === hospitalId) {
      pendingNotifications.delete(id);
    }
  });
  
  if (ambulance && ambulance.ws) {
    sendMessage(ambulance.ws, {
      type: 'navigation_cancelled',
      message: 'Navegación cancelada',
      timestamp: new Date().toISOString()
    });
  }
  
  const hospital = activeHospitals.get(hospitalId);
  if (hospital && hospital.ws) {
    sendMessage(hospital.ws, {
      type: 'navigation_cancelled',
      ambulanceId: ambulanceId,
      message: 'Ambulancia canceló la navegación',
      timestamp: new Date().toISOString()
    });
  }
  
  broadcastActiveAmbulances();
}

function handleHospitalNote(data) {
  const { ambulanceId, note } = data;
  
  const ambulance = activeAmbulances.get(ambulanceId);
  if (ambulance && ambulance.ws) {
    sendMessage(ambulance.ws, {
      type: 'hospital_note',
      note: {
        ...note,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`💌 Nota enviada a ambulancia ${ambulanceId}`);
  }
}

function handleRequestRouteUpdate(ws, data) {
  const { ambulanceId } = data;
  if (!ambulanceId) return;

  const route = activeRoutes.get(ambulanceId);
  if (route) {
    sendMessage(ws, {
      type: 'route_update',
      ambulanceId: ambulanceId,
      routeGeometry: route.routeGeometry,
      distance: route.distance,
      duration: route.duration
    });
  } else {
    sendMessage(ws, {
      type: 'route_update',
      ambulanceId: ambulanceId,
      routeGeometry: null
    });
  }
}

async function handleRequestHospitalsList(ws) {
  const hospitalsList = Array.from(activeHospitals.values()).map(hospital => ({
    id: hospital.info.id,
    nombre: hospital.info.nombre,
    lat: hospital.info.lat,
    lng: hospital.info.lng,
    direccion: hospital.info.direccion,
    especialidades: hospital.info.especialidades || ['General'],
    camasDisponibles: hospital.info.camasDisponibles || 10,
    telefono: hospital.info.telefono || '',
    connected: true
  }));

  sendMessage(ws, {
    type: 'active_hospitals_update',
    hospitals: hospitalsList,
    message: `${hospitalsList.length} hospitales conectados`
  });
}

async function handleGetAllHospitals(ws) {
  try {
    const hospitalsFromDB = await getAllHospitalsFromDB();
    
    // Marcar cuáles están conectados
    const hospitalsWithStatus = hospitalsFromDB.map(hospital => ({
      ...hospital,
      connected: activeHospitals.has(hospital.id),
      // Todos están activos por defecto
      activo: true
    }));

    sendMessage(ws, {
      type: 'all_hospitals_list',
      hospitals: hospitalsWithStatus,
      total: hospitalsWithStatus.length,
      connected: activeHospitals.size
    });
  } catch (error) {
    console.error('❌ Error obteniendo hospitales:', error);
    sendError(ws, 'Error obteniendo lista de hospitales');
  }
}

// ---------- UTILITY FUNCTIONS ----------
function sendMessage(ws, message) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
  } catch (error) {
    console.error('Error enviando mensaje:', error);
  }
  return false;
}

function sendError(ws, message) {
  sendMessage(ws, { type: 'error', message });
}

function cleanupDisconnectedClient(ws) {
  // Limpiar hospitales
  for (let [hospitalId, hospitalData] of activeHospitals.entries()) {
    if (hospitalData.ws === ws) {
      activeHospitals.delete(hospitalId);
      console.log(`🏥 Hospital ${hospitalId} desconectado`);
      broadcastActiveHospitals();
      break;
    }
  }

  // Limpiar ambulancias
  for (let [ambulanceId, ambulanceData] of activeAmbulances.entries()) {
    if (ambulanceData.ws === ws) {
      activeAmbulances.delete(ambulanceId);
      activeRoutes.delete(ambulanceId);
      console.log(`🚑 Ambulancia ${ambulanceId} desconectada`);
      broadcastActiveAmbulances();
      break;
    }
  }
}

// ---------- CLEANUP DE CONEXIONES INACTIVAS ----------
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutos

  // Limpiar ambulancias inactivas
  activeAmbulances.forEach((ambulance, id) => {
    if (ambulance.lastUpdate && (now - ambulance.lastUpdate.getTime()) > timeout) {
      console.log(`🕒 Limpiando ambulancia inactiva: ${id}`);
      activeAmbulances.delete(id);
      activeRoutes.delete(id);
    }
  });

  // Limpiar notificaciones antiguas
  pendingNotifications.forEach((notification, id) => {
    if (notification.timestamp && (now - new Date(notification.timestamp).getTime()) > timeout) {
      console.log(`🕒 Limpiando notificación antigua: ${id}`);
      pendingNotifications.delete(id);
    }
  });
}, 60000);

// Heartbeat mejorado
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.ping();
      } catch (e) {}
    }
  });
}, 30000);

// Iniciar servidor
const PORT = process.env.WS_PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 Servidor WebSocket ejecutándose en puerto ${PORT}`);
  console.log(`📡 Endpoint WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🏥 API Hospitales (todos): http://localhost:${PORT}/api/all-hospitals`);
  console.log(`🏥 API Hospitales (conectados): http://localhost:${PORT}/api/connected-hospitals`);
  console.log(`🏥 API Hospitales (original): http://localhost:${PORT}/api/hospitals`);
  console.log(`🗺️  Geocoding API: http://localhost:${PORT}/geocode`);
  console.log(`🔍 Search API: http://localhost:${PORT}/search-addresses`);
  console.log(`🛣️  Directions API: http://localhost:${PORT}/directions`);
});

module.exports = { wss, activeAmbulances, activeHospitals };