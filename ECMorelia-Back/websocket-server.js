// websocket-server-optimized.js - VERSIÓN MEJORADA
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
const rejectedHospitals = new Map(); // Track de hospitales que han rechazado
const pendingEmergencyRoutes = new Map(); // Nuevo: rutas pendientes hasta aceptación

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

// ---------- CONSULTA DE HOSPITALES DESDE PRISMA (MEJORADO) ----------
async function getAllHospitalsFromDB() {
  try {
    const hospitals = await prisma.hospitales.findMany({
      select: {
        id_hospitales: true,
        nombre: true,
        direccion: true
      }
    });

    return hospitals.map(hospital => ({
      id: hospital.id_hospitales.toString(),
      nombre: hospital.nombre || `Hospital ${hospital.id_hospitales}`,
      direccion: hospital.direccion || '',
      lat: 19.7024, // Valor por defecto (se actualizará con geocoding)
      lng: -101.1969, // Valor por defecto (se actualizará con geocoding)
      especialidades: ['General'],
      camasDisponibles: 10,
      telefono: '',
      activo: true,
      connected: false,
      db_activo: true
    }));
  } catch (error) {
    console.error('❌ Error consultando hospitales desde DB:', error);
    return [];
  }
}

// ---------- GEOCODING MEJORADO PARA TODO MICHOACÁN ----------
async function geocodeAddressMichocan(address) {
  if (!address || address.trim() === '') {
    console.log('❌ Dirección vacía');
    return null;
  }

  try {
    const q = encodeURIComponent(address.trim() + ', Michoacán, México');
    console.log(`📍 Geocoding: ${address}`);
    
    // Mapbox con bounding box expandido para todo Michoacán
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${MAPBOX_TOKEN}&country=mx&limit=15&language=es`;
    
    const mapboxResp = await fetch(mapboxUrl);
    if (mapboxResp.ok) {
      const mapboxData = await mapboxResp.json();
      
      if (mapboxData.features && mapboxData.features.length > 0) {
        // Filtrar resultados en Michoacán
        const michoacanResults = mapboxData.features.filter(f => {
          const isInMichoacan = f.context?.some(ctx => 
            ctx.id?.includes('region') && 
            (ctx.text.toLowerCase().includes('michoacán') || 
             ctx.text.toLowerCase().includes('michoacan'))
          );
          return isInMichoacan || f.relevance > 0.5;
        });
        
        const bestMatch = michoacanResults[0] || mapboxData.features[0];
        
        if (bestMatch) {
          const result = {
            lat: bestMatch.center[1],
            lng: bestMatch.center[0],
            place_name: bestMatch.place_name,
            relevance: bestMatch.relevance,
            type: bestMatch.place_type[0],
            address: bestMatch.properties?.address || '',
            source: 'mapbox',
            raw: bestMatch,
            region: bestMatch.context?.find(ctx => ctx.id.includes('region'))?.text || 'Michoacán',
            municipality: bestMatch.context?.find(ctx => ctx.id.includes('place'))?.text || ''
          };
          
          console.log(`✅ Geocoding exitoso: ${result.place_name} (${result.region})`);
          return result;
        }
      }
    }

    // Fallback a Google-style geocoding si Mapbox falla
    console.log('🔄 Intentando geocoding alternativo...');
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=mx&limit=5`;
    const fallbackResp = await fetch(fallbackUrl);
    
    if (fallbackResp.ok) {
      const fallbackData = await fallbackResp.json();
      if (fallbackData.length > 0) {
        const result = {
          lat: parseFloat(fallbackData[0].lat),
          lng: parseFloat(fallbackData[0].lon),
          place_name: fallbackData[0].display_name,
          relevance: 0.7,
          type: 'fallback',
          address: fallbackData[0].display_name,
          source: 'nominatim',
          region: 'Michoacán'
        };
        console.log(`✅ Geocoding alternativo exitoso: ${result.place_name}`);
        return result;
      }
    }

    console.log('❌ No se pudo geocodificar la dirección');
    return null;

  } catch (error) {
    console.error('💥 Error en geocoding:', error);
    return null;
  }
}

// ---------- SEARCH ADDRESSES MEJORADO CON FILTRO PARA MORELIA ----------
async function searchAddressesMorelia(query) {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const q = encodeURIComponent(query.trim());
    
    // Búsqueda específica para Morelia
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${MAPBOX_TOKEN}&country=mx&limit=10&types=address,poi,place&language=es&bbox=-101.2846,19.6200,-101.1092,19.7850`;
    
    console.log(`🔍 Buscando direcciones en Morelia: ${query}`);
    
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) return [];
    
    // Filtrar y priorizar resultados en Morelia
    const filteredResults = data.features
      .filter(feature => {
        const isAddress = feature.place_type.includes('address');
        const isPOI = feature.place_type.includes('poi');
        const isPlace = feature.place_type.includes('place');
        const hasHighRelevance = feature.relevance > 0.3;
        
        // Verificar si está en Morelia
        const isInMorelia = feature.context?.some(ctx => 
          ctx.id?.includes('place') && 
          (ctx.text.toLowerCase().includes('morelia') ||
           ctx.text.toLowerCase().includes('michoacán'))
        );
        
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
        context: feature.context?.map(ctx => ctx.text).join(', ') || '',
        region: feature.context?.find(ctx => ctx.id.includes('region'))?.text || '',
        municipality: feature.context?.find(ctx => ctx.id.includes('place'))?.text || ''
      }))
      .sort((a, b) => {
        // Priorizar direcciones con números y mayor relevancia
        const aHasNumber = /\d/.test(a.place_name) ? 1 : 0;
        const bHasNumber = /\d/.test(b.place_name) ? 1 : 0;
        const aIsMorelia = a.place_name.toLowerCase().includes('morelia') || a.context.toLowerCase().includes('morelia') ? 1 : 0;
        const bIsMorelia = b.place_name.toLowerCase().includes('morelia') || b.context.toLowerCase().includes('morelia') ? 1 : 0;
        
        return (bHasNumber - aHasNumber) || (bIsMorelia - aIsMorelia) || (b.relevance - a.relevance);
      });

    console.log(`✅ ${filteredResults.length} resultados encontrados para: ${query}`);
    return filteredResults;
    
  } catch (error) {
    console.error('Error en búsqueda de direcciones:', error);
    return [];
  }
}

// ---------- DIRECTIONS CON VALIDACIÓN EXPANDIDA ----------
async function getDirectionsWithTraffic(startLng, startLat, endLng, endLat) {
  try {
    // Validar coordenadas dentro de Michoacán (aproximado)
    const isInMichoacan = (lng, lat) => 
      lng >= -103.5 && lng <= -100.0 && 
      lat >= 18.0 && lat <= 20.5;
    
    if (!isInMichoacan(startLng, startLat) || !isInMichoacan(endLng, endLat)) {
      console.log('⚠️ Coordenadas fuera de área de cobertura');
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
      summary: `${(route.distance / 1000).toFixed(1)} km, ${Math.round(route.duration / 60)} min`,
      steps: route.legs?.[0]?.steps || []
    };

    console.log(`✅ Ruta calculada: ${result.summary}`);
    return result;

  } catch (error) {
    console.error('💥 Error calculando ruta:', error);
    return null;
  }
}

// ---------- FUNCIÓN PARA ENVÍO AUTOMÁTICO INTELIGENTE ----------
async function sendToNextAvailableHospital(ambulanceId, patientInfo, ambulanceLocation, originalHospitalId, alreadyRejected = []) {
  // Agregar hospital original a la lista de rechazados
  const rejectedList = [...alreadyRejected, originalHospitalId];
  
  const hospitalsList = Array.from(activeHospitals.values())
    .filter(hospital => {
      // Filtrar hospitales que ya han rechazado
      const hasRejected = rejectedList.includes(hospital.info.id);
      const isConnected = hospital.ws && hospital.ws.readyState === WebSocket.OPEN;
      const isActive = hospital.info.activo !== false;
      
      return !hasRejected && isConnected && isActive;
    })
    .sort((a, b) => {
      // Ordenar por distancia
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
    routeGeometry: null, // NO enviar ruta hasta aceptación
    rawDistance: route ? route.distance : null,
    rawDuration: route ? route.duration : null,
    timestamp: new Date().toISOString(),
    status: 'pending',
    isAutomatic: true,
    rejectedHospitals: rejectedList
  };

  pendingNotifications.set(notificationId, payload);
  
  // Registrar en mapa de rechazados
  if (!rejectedHospitals.has(ambulanceId)) {
    rejectedHospitals.set(ambulanceId, new Set());
  }
  rejectedHospitals.get(ambulanceId).add(originalHospitalId);

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
      rejectedHospitals: rejectedList,
      message: `Solicitud enviada automáticamente a ${nextHospital.info.nombre}`,
      remainingHospitals: hospitalsList.length - 1
    });
  }

  return {
    hospitalId: nextHospital.info.id,
    rejectedHospitals: rejectedList
  };
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
    connectedAt: hospital.connectedAt,
    activo: hospital.info.activo
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
          const geoResult = await geocodeAddressMichocan(hospital.direccion);
          if (geoResult) {
            hospital.lat = geoResult.lat;
            hospital.lng = geoResult.lng;
            hospital.region = geoResult.region;
            hospital.municipality = geoResult.municipality;
          }
        }
        return hospital;
      })
    );
    
    // Marcamos cuáles están conectados actualmente vía WebSocket
    const hospitalsWithStatus = hospitalsWithCoords.map(hospital => ({
      ...hospital,
      connected: activeHospitals.has(hospital.id),
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
        connectedAt: hospitalData.connectedAt,
        activo: hospitalData.info.activo
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
          const geoResult = await geocodeAddressMichocan(hospital.direccion);
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
    
    const result = await geocodeAddressMichocan(address);
    
    if (!result) {
      return res.status(404).json({ error: 'No se pudo geocodificar la dirección en Michoacán' });
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
    
    // Usar la nueva función que filtra para Morelia
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
    
    // Limpiar rechazados cuando ambulancia se desconecta
    for (let [ambulanceId, ambulanceData] of activeAmbulances.entries()) {
      if (ambulanceData.ws === ws) {
        rejectedHospitals.delete(ambulanceId);
        pendingEmergencyRoutes.delete(ambulanceId);
        break;
      }
    }
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
      await handleHospitalAcceptPatient(data); // Cambiado a async
      break;
      
    case 'hospital_reject_patient':
      await handleHospitalRejectPatient(data);
      break;
      
    case 'cancel_navigation':
      handleCancelNavigation(data);
      break;
      
    case 'cancel_emergency_marker':
      handleCancelEmergencyMarker(data);
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
  const hospitalsList = Array.from(activeHospitals.values())
    .filter(hospital => hospital.info.activo !== false)
    .map(hospital => ({
      id: hospital.info.id,
      nombre: hospital.info.nombre,
      lat: hospital.info.lat,
      lng: hospital.info.lng,
      direccion: hospital.info.direccion,
      especialidades: hospital.info.especialidades || ['General'],
      camasDisponibles: hospital.info.camasDisponibles || 10,
      telefono: hospital.info.telefono || '',
      connected: true,
      activo: hospital.info.activo
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
        activo: data.hospital.activo !== undefined ? data.hospital.activo : true
      },
      ws: ws,
      connectedAt: new Date().toISOString(),
      isFromDB: true
    };

    // Verificar coordenadas - geocodificar si es necesario
    if ((!hospitalData.info.lat || !hospitalData.info.lng || 
        hospitalData.info.lat === 19.7024) && hospitalData.info.direccion) {
      console.log(`📍 Geocoding para hospital: ${hospitalData.info.direccion}`);
      const geoResult = await geocodeAddressMichocan(hospitalData.info.direccion);
      
      if (geoResult) {
        hospitalData.info.lat = geoResult.lat;
        hospitalData.info.lng = geoResult.lng;
        hospitalData.info.region = geoResult.region;
        hospitalData.info.municipality = geoResult.municipality;
        console.log(`✅ Hospital geocoded: ${hospitalData.info.lat}, ${hospitalData.info.lng} (${geoResult.region})`);
      }
    }

    activeHospitals.set(hospitalData.info.id, hospitalData);
    console.log(`🏥 Hospital registrado: ${hospitalData.info.nombre} (${hospitalData.info.id}) - Activo: ${hospitalData.info.activo}`);

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

    console.log(`📍 Ubicación actualizada: ${ambulanceId} - ${ambulance.speed} km/h - ${ambulance.heading}°`);
  }
}

async function handlePatientTransferNotification(data) {
  const notificationId = data.notificationId || `notif_${Date.now()}`;
  
  const payload = {
    ...data,
    notificationId: notificationId,
    timestamp: new Date().toISOString(),
    status: 'pending',
    routeGeometry: null // NO enviar ruta en la notificación inicial
  };

  pendingNotifications.set(notificationId, payload);

  // Guardar datos de ruta pendiente hasta aceptación
  if (data.routeGeometry) {
    pendingEmergencyRoutes.set(notificationId, {
      ambulanceId: data.ambulanceId,
      hospitalId: data.hospitalId,
      routeGeometry: data.routeGeometry,
      distance: data.distance,
      duration: data.duration,
      isEmergencyRoute: data.emergencyMode === 'atender_emergencia'
    });
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

// NUEVO HANDLER: Aceptación de paciente con envío de ruta
async function handleHospitalAcceptPatient(data) {
  const notification = pendingNotifications.get(data.notificationId);
  if (!notification) return;

  // Obtener datos de ruta pendiente
  const pendingRoute = pendingEmergencyRoutes.get(data.notificationId);
  
  const ambulance = activeAmbulances.get(notification.ambulanceId);
  if (ambulance && ambulance.ws) {
    // Si hay ruta pendiente, enviarla ahora que el hospital aceptó
    if (pendingRoute) {
      sendMessage(ambulance.ws, {
        type: 'patient_accepted_with_route',
        notificationId: data.notificationId,
        hospitalId: data.hospitalId,
        hospitalInfo: data.hospitalInfo,
        message: 'Hospital ha aceptado al paciente. Ruta trazada.',
        routeGeometry: pendingRoute.routeGeometry,
        distance: pendingRoute.distance,
        duration: pendingRoute.duration,
        timestamp: new Date().toISOString(),
        isEmergencyRoute: pendingRoute.isEmergencyRoute
      });
    } else {
      // Si no hay ruta pendiente, enviar aceptación sin ruta
      sendMessage(ambulance.ws, {
        type: 'patient_accepted',
        notificationId: data.notificationId,
        hospitalId: data.hospitalId,
        hospitalInfo: data.hospitalInfo,
        message: 'Hospital ha aceptado al paciente. Proceda con el traslado.',
        timestamp: new Date().toISOString()
      });
    }
    
    // Establecer ruta activa
    ambulance.status = 'en_ruta';
    
    // Limpiar rechazados para esta ambulancia
    if (rejectedHospitals.has(notification.ambulanceId)) {
      rejectedHospitals.delete(notification.ambulanceId);
    }
    
    // Limpiar ruta pendiente
    pendingEmergencyRoutes.delete(data.notificationId);
    
    console.log(`✅ Paciente aceptado por hospital ${data.hospitalId}`);
  }

  pendingNotifications.delete(data.notificationId);
  broadcastActiveAmbulances();
}

async function handleHospitalRejectPatient(data) {
  const notification = pendingNotifications.get(data.notificationId);
  if (!notification) return;

  const ambulance = activeAmbulances.get(notification.ambulanceId);
  if (ambulance && ambulance.ws) {
    sendMessage(ambulance.ws, {
      type: 'patient_rejected',
      notificationId: data.notificationId,
      hospitalId: data.hospitalId,
      reason: data.reason || 'No especificado',
      message: 'Hospital no puede aceptar al paciente.',
      timestamp: new Date().toISOString()
    });
    
    // Obtener lista de hospitales ya rechazados
    const alreadyRejected = rejectedHospitals.get(notification.ambulanceId) || new Set();
    const rejectedList = Array.from(alreadyRejected);
    
    // Agregar este hospital a la lista de rechazados
    rejectedList.push(data.hospitalId);
    
    // Verificar si hay hospitales disponibles que no hayan rechazado
    const availableHospitals = Array.from(activeHospitals.values())
      .filter(hospital => {
        const hasRejected = rejectedList.includes(hospital.info.id);
        const isConnected = hospital.ws && hospital.ws.readyState === WebSocket.OPEN;
        const isActive = hospital.info.activo !== false;
        
        return !hasRejected && isConnected && isActive;
      })
      .sort((a, b) => {
        const distA = calculateDistance(
          notification.ambulanceLocation.lat, notification.ambulanceLocation.lng,
          a.info.lat, a.info.lng
        );
        const distB = calculateDistance(
          notification.ambulanceLocation.lat, notification.ambulanceLocation.lng,
          b.info.lat, b.info.lng
        );
        return distA - distB;
      });

    if (availableHospitals.length > 0) {
      // Enviar al siguiente hospital disponible
      const nextHospital = availableHospitals[0];
      
      const newNotificationId = `auto_${Date.now()}`;
      const newNotification = {
        ...notification,
        notificationId: newNotificationId,
        hospitalId: nextHospital.info.id,
        isAutomatic: true
      };
      
      pendingNotifications.set(newNotificationId, newNotification);
      
      // Enviar notificación al nuevo hospital
      if (nextHospital.ws && nextHospital.ws.readyState === WebSocket.OPEN) {
        sendMessage(nextHospital.ws, {
          type: 'patient_transfer_notification',
          ...newNotification
        });
        
        sendMessage(ambulance.ws, {
          type: 'automatic_redirect',
          originalHospitalId: data.hospitalId,
          newHospitalId: nextHospital.info.id,
          hospitalInfo: nextHospital.info,
          rejectedHospitals: rejectedList,
          message: `Solicitud enviada automáticamente a ${nextHospital.info.nombre}`,
          remainingHospitals: availableHospitals.length - 1
        });
        
        console.log(`🔄 Solicitud enviada a hospital ${nextHospital.info.id}`);
      }
    } else {
      // No hay más hospitales disponibles
      sendMessage(ambulance.ws, {
        type: 'no_hospitals_available',
        message: 'Todos los hospitales disponibles han rechazado la solicitud',
        timestamp: new Date().toISOString()
      });
      
      // Limpiar ruta pendiente si existe
      pendingEmergencyRoutes.delete(data.notificationId);
    }
    
    console.log(`❌ Paciente rechazado por hospital ${data.hospitalId}`);
  }

  pendingNotifications.delete(data.notificationId);
  broadcastActiveAmbulances();
}

// NUEVO HANDLER: Cancelar marcador de emergencia
function handleCancelEmergencyMarker(data) {
  const { ambulanceId } = data;
  
  console.log(`🗑️ Cancelando marcador de emergencia para ambulancia: ${ambulanceId}`);
  
  // Notificar a la ambulancia que debe limpiar el marcador
  const ambulance = activeAmbulances.get(ambulanceId);
  if (ambulance && ambulance.ws) {
    sendMessage(ambulance.ws, {
      type: 'emergency_marker_cancelled',
      message: 'Marcador de emergencia eliminado',
      timestamp: new Date().toISOString()
    });
  }
  
  // Limpiar rutas pendientes de emergencia
  for (let [key, route] of pendingEmergencyRoutes.entries()) {
    if (route.ambulanceId === ambulanceId && route.isEmergencyRoute) {
      pendingEmergencyRoutes.delete(key);
    }
  }
}

function handleCancelNavigation(data) {
  const { ambulanceId, hospitalId, routeKey, isEmergencyRoute } = data;
  
  console.log(`🛑 Cancelando navegación: ambulancia ${ambulanceId}, hospital ${hospitalId}`);
  
  const ambulance = activeAmbulances.get(ambulanceId);
  if (ambulance) {
    ambulance.status = 'disponible';
  }
  
  // Eliminar ruta específica si se proporciona routeKey, sino todas las rutas de esta ambulancia
  if (routeKey) {
    activeRoutes.delete(routeKey);
  } else {
    for (let [key, route] of activeRoutes.entries()) {
      if (route.ambulanceId === ambulanceId && route.hospitalId === hospitalId) {
        activeRoutes.delete(key);
      }
    }
  }
  
  // Limpiar rechazados para esta ambulancia
  rejectedHospitals.delete(ambulanceId);
  
  // Limpiar notificaciones pendientes
  pendingNotifications.forEach((notif, id) => {
    if (notif.ambulanceId === ambulanceId && notif.hospitalId === hospitalId) {
      pendingNotifications.delete(id);
    }
  });
  
  // Limpiar rutas pendientes de emergencia si se cancela una emergencia
  if (isEmergencyRoute) {
    for (let [key, route] of pendingEmergencyRoutes.entries()) {
      if (route.ambulanceId === ambulanceId && route.isEmergencyRoute) {
        pendingEmergencyRoutes.delete(key);
      }
    }
  }
  
  if (ambulance && ambulance.ws) {
    sendMessage(ambulance.ws, {
      type: 'navigation_cancelled',
      message: 'Navegación cancelada',
      timestamp: new Date().toISOString(),
      isEmergencyRoute: isEmergencyRoute || false
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
  const { ambulanceId, hospitalId } = data;
  if (!ambulanceId) return;

  // Buscar todas las rutas activas para esta ambulancia
  const routes = [];
  for (let [key, route] of activeRoutes.entries()) {
    if (route.ambulanceId === ambulanceId) {
      if (!hospitalId || route.hospitalId === hospitalId) {
        routes.push({
          routeKey: key,
          routeGeometry: route.routeGeometry,
          distance: route.distance,
          duration: route.duration,
          hospitalId: route.hospitalId
        });
      }
    }
  }

  sendMessage(ws, {
    type: 'route_update',
    ambulanceId: ambulanceId,
    routes: routes
  });
}

async function handleRequestHospitalsList(ws) {
  const hospitalsList = Array.from(activeHospitals.values())
    .filter(hospital => hospital.info.activo !== false)
    .map(hospital => ({
      id: hospital.info.id,
      nombre: hospital.info.nombre,
      lat: hospital.info.lat,
      lng: hospital.info.lng,
      direccion: hospital.info.direccion,
      especialidades: hospital.info.especialidades || ['General'],
      camasDisponibles: hospital.info.camasDisponibles || 10,
      telefono: hospital.info.telefono || '',
      connected: true,
      activo: hospital.info.activo
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
    
    // Geocodificar hospitales para obtener coordenadas
    const hospitalsWithCoords = await Promise.all(
      hospitalsFromDB.map(async (hospital) => {
        if (hospital.direccion && hospital.direccion.trim() !== '') {
          const geoResult = await geocodeAddressMichocan(hospital.direccion);
          if (geoResult) {
            hospital.lat = geoResult.lat;
            hospital.lng = geoResult.lng;
            hospital.region = geoResult.region;
            hospital.municipality = geoResult.municipality;
          }
        }
        return hospital;
      })
    );
    
    // Marcar cuáles están conectados
    const hospitalsWithStatus = hospitalsWithCoords.map(hospital => ({
      ...hospital,
      connected: activeHospitals.has(hospital.id),
      activo: hospital.activo
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
      
      // Limpiar rutas de esta ambulancia
      for (let [key, route] of activeRoutes.entries()) {
        if (route.ambulanceId === ambulanceId) {
          activeRoutes.delete(key);
        }
      }
      
      // Limpiar rechazados
      rejectedHospitals.delete(ambulanceId);
      
      // Limpiar rutas pendientes
      for (let [key, route] of pendingEmergencyRoutes.entries()) {
        if (route.ambulanceId === ambulanceId) {
          pendingEmergencyRoutes.delete(key);
        }
      }
      
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
      
      // Limpiar rutas
      for (let [key, route] of activeRoutes.entries()) {
        if (route.ambulanceId === id) {
          activeRoutes.delete(key);
        }
      }
      
      // Limpiar rechazados
      rejectedHospitals.delete(id);
      
      // Limpiar rutas pendientes
      for (let [key, route] of pendingEmergencyRoutes.entries()) {
        if (route.ambulanceId === id) {
          pendingEmergencyRoutes.delete(key);
        }
      }
    }
  });

  // Limpiar notificaciones antiguas
  pendingNotifications.forEach((notification, id) => {
    if (notification.timestamp && (now - new Date(notification.timestamp).getTime()) > timeout) {
      console.log(`🕒 Limpiando notificación antigua: ${id}`);
      pendingNotifications.delete(id);
    }
  });
  
  // Limpiar rutas antiguas
  activeRoutes.forEach((route, key) => {
    if (route.updatedAt && (now - route.updatedAt) > timeout) {
      console.log(`🕒 Limpiando ruta antigua: ${key}`);
      activeRoutes.delete(key);
    }
  });
  
  // Limpiar rechazados antiguos (1 hora)
  rejectedHospitals.forEach((rejectedSet, ambulanceId) => {
    if (!activeAmbulances.has(ambulanceId)) {
      console.log(`🕒 Limpiando rechazados de ambulancia inactiva: ${ambulanceId}`);
      rejectedHospitals.delete(ambulanceId);
    }
  });
  
  // Limpiar rutas pendientes antiguas
  pendingEmergencyRoutes.forEach((route, key) => {
    if (route.timestamp && (now - new Date(route.timestamp).getTime()) > timeout) {
      console.log(`🕒 Limpiando ruta pendiente antigua: ${key}`);
      pendingEmergencyRoutes.delete(key);
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
  console.log(`🔍 Search API (Morelia): http://localhost:${PORT}/search-addresses`);
  console.log(`🛣️  Directions API: http://localhost:${PORT}/directions`);
});

module.exports = { wss, activeAmbulances, activeHospitals, rejectedHospitals };