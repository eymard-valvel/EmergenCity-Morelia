// server-websocket-mejorado.js
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const app = express();
const PORT = 3002;

// Servidor HTTP
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Estado global
const connectedClients = {
  ambulances: {},
  hospitals: {},
  operators: {}
};

// Datos de simulación
const simulationState = {
  activeRoutes: {}, // { ambulanceId: { route, progress, estimatedArrival, startTime } }
  trafficConditions: {}, // Para simular condiciones de tráfico
  hospitalLocations: {} // Cache de ubicaciones de hospitales
};

// Datos de prueba para hospitales
const sampleHospitals = [
  {
    id: 'HOSP001',
    nombre: 'Hospital General Morelia',
    direccion: 'Calle Hospital #123, Morelia, Michoacán',
    lat: 19.7024,
    lng: -101.1969,
    especialidades: ['Urgencias', 'Cirugía', 'Pediatría'],
    camasDisponibles: 15,
    telefono: '443-123-4567',
    activo: true,
    connected: false
  },
  {
    id: 'HOSP002',
    nombre: 'Hospital ISSSTE',
    direccion: 'Av. Madero #456, Morelia, Michoacán',
    lat: 19.7045,
    lng: -101.1923,
    especialidades: ['Traumatología', 'Cardiología'],
    camasDisponibles: 8,
    telefono: '443-234-5678',
    activo: true,
    connected: false
  }
];

// Coordenadas de referencia para simulación (Morelia, Michoacán)
const SIMULATION_BOUNDS = {
  minLat: 19.68,
  maxLat: 19.73,
  minLng: -101.22,
  maxLng: -101.17
};

// Función para generar ubicaciones aleatorias dentro de los bounds
function generateRandomLocation() {
  const lat = SIMULATION_BOUNDS.minLat + Math.random() * (SIMULATION_BOUNDS.maxLat - SIMULATION_BOUNDS.minLat);
  const lng = SIMULATION_BOUNDS.minLng + Math.random() * (SIMULATION_BOUNDS.maxLng - SIMULATION_BOUNDS.minLng);
  return { lat, lng };
}

// Función para calcular distancia entre dos puntos (Haversine)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distancia en metros
}

// Función para generar ruta simulada con puntos intermedios
function generateSimulatedRoute(start, end, numPoints = 20) {
  const route = [];
  
  // Agregar punto de inicio
  route.push([start.lng, start.lat]);
  
  // Generar puntos intermedios (simulación de camino)
  for (let i = 1; i < numPoints - 1; i++) {
    const progress = i / (numPoints - 1);
    const lat = start.lat + (end.lat - start.lat) * progress;
    const lng = start.lng + (end.lng - start.lng) * progress;
    
    // Agregar pequeñas variaciones para simular camino real
    const variation = 0.0002;
    route.push([
      lng + (Math.random() - 0.5) * variation,
      lat + (Math.random() - 0.5) * variation
    ]);
  }
  
  // Agregar punto final
  route.push([end.lng, end.lat]);
  
  return route;
}

// Función para calcular ETA basado en distancia y tráfico
function calculateETA(distance, trafficFactor = 1.0) {
  // Velocidad promedio en km/h (considerando tráfico)
  const averageSpeed = 40 / trafficFactor; // km/h
  
  // Tiempo en horas
  const timeHours = (distance / 1000) / averageSpeed;
  
  // Convertir a minutos
  return Math.round(timeHours * 60);
}

// Función para simular condiciones de tráfico
function simulateTrafficConditions() {
  const now = new Date();
  const hour = now.getHours();
  
  // Más tráfico en horas pico
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    return 1.5; // 50% más de tiempo
  } else if (hour >= 22 || hour <= 5) {
    return 0.8; // 20% menos de tiempo (noche)
  }
  
  return 1.0; // Condiciones normales
}

// Función para actualizar progreso de rutas
function updateRouteProgress() {
  const now = Date.now();
  
  Object.keys(simulationState.activeRoutes).forEach(ambulanceId => {
    const routeData = simulationState.activeRoutes[ambulanceId];
    
    if (!routeData || !routeData.startTime) return;
    
    const elapsedTime = (now - routeData.startTime) / 1000; // En segundos
    const totalEstimatedTime = routeData.estimatedDuration * 60; // En segundos
    
    // Calcular progreso (0 a 1)
    let progress = Math.min(elapsedTime / totalEstimatedTime, 1);
    
    // Actualizar progreso
    simulationState.activeRoutes[ambulanceId].progress = progress;
    
    // Si la ruta está completa, notificar
    if (progress >= 1 && !routeData.completed) {
      simulationState.activeRoutes[ambulanceId].completed = true;
      
      // Notificar a hospital y operador
      broadcastToType('hospitals', {
        type: 'patient_arrived',
        ambulanceId,
        hospitalId: routeData.hospitalId,
        timestamp: new Date().toISOString()
      });
      
      broadcastToType('operators', {
        type: 'patient_arrived',
        ambulanceId,
        hospitalId: routeData.hospitalId,
        timestamp: new Date().toISOString()
      });
    }
  });
}

// Función para obtener ubicación actual en la ruta
function getCurrentPositionOnRoute(route, progress) {
  if (!route || route.length < 2 || progress <= 0) {
    return route[0] ? { lng: route[0][0], lat: route[0][1] } : null;
  }
  
  if (progress >= 1) {
    const lastPoint = route[route.length - 1];
    return { lng: lastPoint[0], lat: lastPoint[1] };
  }
  
  // Calcular segmento actual
  const totalSegments = route.length - 1;
  const segmentProgress = progress * totalSegments;
  const segmentIndex = Math.floor(segmentProgress);
  const segmentFraction = segmentProgress - segmentIndex;
  
  if (segmentIndex >= totalSegments) {
    const lastPoint = route[route.length - 1];
    return { lng: lastPoint[0], lat: lastPoint[1] };
  }
  
  // Interpolar entre puntos del segmento
  const pointA = route[segmentIndex];
  const pointB = route[segmentIndex + 1];
  
  const lat = pointA[1] + (pointB[1] - pointA[1]) * segmentFraction;
  const lng = pointA[0] + (pointB[0] - pointA[0]) * segmentFraction;
  
  // Agregar pequeña variación para simular movimiento real
  const variation = 0.00005;
  return {
    lat: lat + (Math.random() - 0.5) * variation,
    lng: lng + (Math.random() - 0.5) * variation
  };
}

// Broadcast functions
function broadcastToAll(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function broadcastToType(type, data) {
  const message = JSON.stringify(data);
  Object.values(connectedClients[type]).forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function sendToClient(clientId, data) {
  // Buscar en todos los tipos
  for (const type of ['ambulances', 'hospitals', 'operators']) {
    const client = connectedClients[type][clientId];
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
      return true;
    }
  }
  return false;
}

// Inicializar intervalos de simulación
setInterval(() => {
  // Actualizar progreso de rutas
  updateRouteProgress();
  
  // Actualizar ubicaciones de ambulancias en ruta
  Object.keys(simulationState.activeRoutes).forEach(ambulanceId => {
    const routeData = simulationState.activeRoutes[ambulanceId];
    
    if (routeData && routeData.route && routeData.progress < 1) {
      const currentPos = getCurrentPositionOnRoute(routeData.route, routeData.progress);
      
      if (currentPos) {
        // Calcular velocidad basada en progreso y distancia
        const speed = 40 + Math.random() * 20; // 40-60 km/h
        
        // Enviar actualización de ubicación
        broadcastToAll({
          type: 'location_update',
          ambulanceId,
          location: currentPos,
          speed: Math.round(speed),
          heading: Math.random() * 360,
          timestamp: new Date().toISOString(),
          progress: routeData.progress,
          estimatedArrival: routeData.estimatedArrival
        });
        
        // Enviar actualización de ruta (puntos restantes)
        if (routeData.route && routeData.progress > 0) {
          const remainingPoints = Math.max(2, Math.round(routeData.route.length * (1 - routeData.progress)));
          const startIndex = Math.round(routeData.route.length * routeData.progress);
          const remainingRoute = routeData.route.slice(startIndex);
          
          broadcastToAll({
            type: 'route_update_progress',
            ambulanceId,
            remainingRoute,
            progress: routeData.progress,
            distanceRemaining: routeData.distance * (1 - routeData.progress),
            etaRemaining: routeData.estimatedDuration * (1 - routeData.progress) * 60
          });
        }
      }
    }
  });
  
  // Simular nuevas emergencias periódicamente
  if (Math.random() < 0.1) { // 10% de probabilidad cada intervalo
    simulateNewEmergency();
  }
}, 3000); // Actualizar cada 3 segundos

// Función para simular nueva emergencia
function simulateNewEmergency() {
  const ambulanceIds = Object.keys(connectedClients.ambulances);
  const hospitalIds = Object.keys(connectedClients.hospitals);
  
  if (ambulanceIds.length === 0 || hospitalIds.length === 0) return;
  
  // Seleccionar ambulancia y hospital aleatorios
  const randomAmbulanceId = ambulanceIds[Math.floor(Math.random() * ambulanceIds.length)];
  const randomHospitalId = hospitalIds[Math.floor(Math.random() * hospitalIds.length)];
  
  // Generar datos de emergencia simulados
  const emergencyTypes = ['Accidente', 'Infarto', 'Embarazo', 'Fractura', 'Quemadura'];
  const patientAges = [25, 30, 45, 60, 75];
  const patientSexes = ['Masculino', 'Femenino'];
  
  const emergencyData = {
    type: 'patient_transfer_notification',
    notificationId: `EMERG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ambulanceId: randomAmbulanceId,
    hospitalId: randomHospitalId,
    patientInfo: {
      age: patientAges[Math.floor(Math.random() * patientAges.length)],
      sex: patientSexes[Math.floor(Math.random() * patientSexes.length)],
      type: emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)],
      severity: Math.floor(Math.random() * 5) + 1,
      timestamp: new Date().toISOString()
    },
    location: generateRandomLocation(),
    timestamp: new Date().toISOString()
  };
  
  // Enviar notificación al hospital
  sendToClient(randomHospitalId, emergencyData);
  
  // Enviar notificación al operador
  broadcastToType('operators', emergencyData);
  
  console.log(`🚨 Simulada nueva emergencia: ${emergencyData.patientInfo.type} para hospital ${randomHospitalId}`);
}

// WebSocket Connection Handler
wss.on('connection', (ws, req) => {
  console.log('🔌 Nuevo cliente WebSocket conectado');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON format' }));
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Cliente WebSocket desconectado');
    removeClient(ws);
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  // Enviar confirmación de conexión
  ws.send(JSON.stringify({ 
    type: 'connection_established',
    message: 'Conexión establecida con el servidor de emergencias',
    timestamp: new Date().toISOString()
  }));
});

function handleMessage(ws, data) {
  switch (data.type) {
    case 'register_ambulance':
      handleAmbulanceRegistration(ws, data);
      break;
      
    case 'register_hospital':
      handleHospitalRegistration(ws, data);
      break;
      
    case 'register_operator':
      handleOperatorRegistration(ws, data);
      break;
      
    case 'location_update':
      handleLocationUpdate(data);
      break;
      
    case 'request_route':
      handleRouteRequest(ws, data);
      break;
      
    case 'start_navigation':
      handleStartNavigation(data);
      break;
      
    case 'cancel_navigation':
      handleCancelNavigation(data);
      break;
      
    case 'hospital_accept_patient':
      handleHospitalAcceptPatient(data);
      break;
      
    case 'hospital_reject_patient':
      handleHospitalRejectPatient(data);
      break;
      
    case 'patient_status_update':
      handlePatientStatusUpdate(data);
      break;
      
    case 'request_ambulances':
      sendAmbulancesList(ws);
      break;
      
    case 'request_hospitals':
      sendHospitalsList(ws);
      break;
      
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;
      
    default:
      console.log('📨 Mensaje no manejado:', data.type);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: `Tipo de mensaje no reconocido: ${data.type}` 
      }));
  }
}

function handleAmbulanceRegistration(ws, data) {
  const ambulance = data.ambulance;
  if (!ambulance || !ambulance.id) {
    ws.send(JSON.stringify({ type: 'error', message: 'Datos de ambulancia incompletos' }));
    return;
  }
  
  connectedClients.ambulances[ambulance.id] = ws;
  ambulance.connected = true;
  
  console.log(`🚑 Ambulancia registrada: ${ambulance.id} - ${ambulance.placa}`);
  
  // Enviar confirmación
  ws.send(JSON.stringify({
    type: 'registration_confirmed',
    clientType: 'ambulance',
    ambulanceId: ambulance.id,
    message: 'Ambulancia registrada exitosamente'
  }));
  
  // Notificar a operadores
  broadcastToType('operators', {
    type: 'ambulance_connected',
    ambulanceId: ambulance.id,
    ambulanceInfo: ambulance
  });
  
  // Enviar lista de hospitales activos
  const activeHospitals = Object.values(connectedClients.hospitals)
    .filter(h => h.hospitalInfo && h.hospitalInfo.activo)
    .map(h => h.hospitalInfo);
  
  ws.send(JSON.stringify({
    type: 'active_hospitals_update',
    hospitals: activeHospitals
  }));
}

function handleHospitalRegistration(ws, data) {
  const hospital = data.hospital;
  if (!hospital || !hospital.id) {
    ws.send(JSON.stringify({ type: 'error', message: 'Datos de hospital incompletos' }));
    return;
  }
  
  connectedClients.hospitals[hospital.id] = { 
    ws, 
    hospitalInfo: hospital,
    lastActive: Date.now()
  };
  
  simulationState.hospitalLocations[hospital.id] = {
    lat: hospital.lat,
    lng: hospital.lng
  };
  
  console.log(`🏥 Hospital registrado: ${hospital.id} - ${hospital.nombre} (${hospital.activo ? 'ACTIVO' : 'INACTIVO'})`);
  
  // Enviar confirmación
  ws.send(JSON.stringify({
    type: 'registration_confirmed',
    clientType: 'hospital',
    hospitalId: hospital.id,
    message: 'Hospital registrado exitosamente'
  }));
  
  // Notificar a operadores y ambulancias
  broadcastToType('operators', {
    type: 'hospital_connected',
    hospitalId: hospital.id,
    hospitalInfo: hospital
  });
  
  broadcastToType('ambulances', {
    type: 'active_hospitals_update',
    hospitals: [hospital]
  });
}

function handleOperatorRegistration(ws, data) {
  const operator = data.operator;
  const operatorId = operator?.id || `OPERATOR_${Date.now()}`;
  
  connectedClients.operators[operatorId] = ws;
  
  console.log(`👨‍💼 Operador registrado: ${operatorId}`);
  
  // Enviar confirmación con datos iniciales
  ws.send(JSON.stringify({
    type: 'registration_confirmed',
    clientType: 'operator',
    operatorId,
    message: 'Operador registrado exitosamente',
    initialData: {
      ambulances: Object.keys(connectedClients.ambulances).map(id => ({
        id,
        connected: true
      })),
      hospitals: Object.values(connectedClients.hospitals)
        .filter(h => h.hospitalInfo)
        .map(h => h.hospitalInfo),
      activeRoutes: simulationState.activeRoutes
    }
  }));
}

function handleLocationUpdate(data) {
  if (!data.ambulanceId || !data.location) return;
  
  // Actualizar ubicación en tiempo real
  broadcastToAll({
    type: 'location_update',
    ambulanceId: data.ambulanceId,
    location: data.location,
    speed: data.speed || 0,
    heading: data.heading || 0,
    timestamp: new Date().toISOString()
  });
}

function handleRouteRequest(ws, data) {
  const { ambulanceId, destination, origin } = data;
  
  if (!ambulanceId || !destination) {
    ws.send(JSON.stringify({ type: 'error', message: 'Datos de ruta incompletos' }));
    return;
  }
  
  // Generar ruta simulada
  const startLocation = origin || generateRandomLocation();
  const endLocation = destination.coordinates || simulationState.hospitalLocations[destination.hospitalId] || generateRandomLocation();
  
  const routeGeometry = generateSimulatedRoute(startLocation, endLocation);
  const distance = calculateDistance(startLocation.lat, startLocation.lng, endLocation.lat, endLocation.lng);
  const trafficFactor = simulateTrafficConditions();
  const duration = calculateETA(distance, trafficFactor);
  
  const routeData = {
    type: 'route_calculated',
    ambulanceId,
    routeGeometry,
    distance,
    duration,
    trafficFactor,
    formattedDistance: `${(distance / 1000).toFixed(1)} km`,
    formattedDuration: `${duration} min`,
    steps: [
      { instruction: 'Salir de la ubicación actual', distance: '0 km', duration: '0 min' },
      { instruction: 'Tomar carretera principal', distance: `${(distance / 2000).toFixed(1)} km`, duration: `${Math.round(duration / 3)} min` },
      { instruction: `Llegar a ${destination.hospitalName || 'Hospital'}`, distance: `${(distance / 1000).toFixed(1)} km`, duration: `${duration} min` }
    ]
  };
  
  // Enviar ruta al solicitante
  ws.send(JSON.stringify(routeData));
  
  // Notificar a otros clientes interesados
  broadcastToAll({
    type: 'route_update',
    ambulanceId,
    routeGeometry,
    distance,
    duration,
    formattedDistance: `${(distance / 1000).toFixed(1)} km`,
    formattedDuration: `${duration} min`
  });
}

function handleStartNavigation(data) {
  const { ambulanceId, routeGeometry, destination, estimatedDuration } = data;
  
  if (!ambulanceId || !routeGeometry || !destination) {
    console.error('❌ Datos incompletos para iniciar navegación');
    return;
  }
  
  const distance = calculateDistance(
    routeGeometry[0][1], routeGeometry[0][0],
    routeGeometry[routeGeometry.length - 1][1], routeGeometry[routeGeometry.length - 1][0]
  );
  
  const trafficFactor = simulateTrafficConditions();
  const adjustedDuration = estimatedDuration || calculateETA(distance, trafficFactor);
  
  // Guardar estado de navegación
  simulationState.activeRoutes[ambulanceId] = {
    route: routeGeometry,
    progress: 0,
    startTime: Date.now(),
    estimatedDuration: adjustedDuration,
    estimatedArrival: new Date(Date.now() + adjustedDuration * 60000).toISOString(),
    distance,
    hospitalId: destination.hospitalId,
    destinationName: destination.hospitalName || 'Hospital',
    completed: false
  };
  
  console.log(`📍 Navegación iniciada para ambulancia ${ambulanceId}. ETA: ${adjustedDuration} min`);
  
  // Notificar a todos
  broadcastToAll({
    type: 'navigation_started',
    ambulanceId,
    destination,
    estimatedDuration: adjustedDuration,
    estimatedArrival: new Date(Date.now() + adjustedDuration * 60000).toISOString(),
    distance,
    timestamp: new Date().toISOString()
  });
}

function handleCancelNavigation(data) {
  const { ambulanceId } = data;
  
  if (!ambulanceId) return;
  
  // Eliminar ruta activa
  delete simulationState.activeRoutes[ambulanceId];
  
  console.log(`❌ Navegación cancelada para ambulancia ${ambulanceId}`);
  
  // Notificar a todos
  broadcastToAll({
    type: 'navigation_cancelled',
    ambulanceId,
    reason: data.reason || 'Navegación cancelada por el operador',
    timestamp: new Date().toISOString()
  });
}

function handleHospitalAcceptPatient(data) {
  const { notificationId, hospitalId, hospitalInfo } = data;
  
  console.log(`✅ Hospital ${hospitalId} aceptó paciente (notificación: ${notificationId})`);
  
  // Notificar a todos los operadores
  broadcastToType('operators', {
    type: 'patient_accepted',
    notificationId,
    hospitalId,
    hospitalInfo,
    timestamp: new Date().toISOString()
  });
  
  // Buscar ambulancia asociada (esto normalmente vendría en la notificación)
  // Por ahora, notificamos a todas las ambulancias
  broadcastToType('ambulances', {
    type: 'destination_confirmed',
    hospitalId,
    hospitalInfo,
    timestamp: new Date().toISOString()
  });
}

function handleHospitalRejectPatient(data) {
  const { notificationId, hospitalId, reason } = data;
  
  console.log(`❌ Hospital ${hospitalId} rechazó paciente: ${reason}`);
  
  // Notificar a todos los operadores
  broadcastToType('operators', {
    type: 'patient_rejected',
    notificationId,
    hospitalId,
    reason,
    timestamp: new Date().toISOString()
  });
}

function handlePatientStatusUpdate(data) {
  broadcastToAll({
    type: 'patient_status_update',
    ...data,
    timestamp: new Date().toISOString()
  });
}

function sendAmbulancesList(ws) {
  const ambulancesList = Object.keys(connectedClients.ambulances).map(id => ({
    id,
    connected: true,
    lastUpdate: new Date().toISOString()
  }));
  
  ws.send(JSON.stringify({
    type: 'active_ambulances_update',
    ambulances: ambulancesList,
    timestamp: new Date().toISOString()
  }));
}

function sendHospitalsList(ws) {
  const hospitalsList = Object.values(connectedClients.hospitals)
    .filter(h => h.hospitalInfo)
    .map(h => h.hospitalInfo);
  
  ws.send(JSON.stringify({
    type: 'active_hospitals_update',
    hospitals: hospitalsList,
    timestamp: new Date().toISOString()
  }));
}

function removeClient(ws) {
  // Buscar y eliminar en ambulancias
  for (const [id, client] of Object.entries(connectedClients.ambulances)) {
    if (client === ws) {
      delete connectedClients.ambulances[id];
      console.log(`🚑 Ambulancia desconectada: ${id}`);
      
      // Notificar a operadores
      broadcastToType('operators', {
        type: 'ambulance_disconnected',
        ambulanceId: id,
        timestamp: new Date().toISOString()
      });
      
      // Eliminar rutas activas
      delete simulationState.activeRoutes[id];
      return;
    }
  }
  
  // Buscar y eliminar en hospitales
  for (const [id, clientData] of Object.entries(connectedClients.hospitals)) {
    if (clientData.ws === ws) {
      delete connectedClients.hospitals[id];
      delete simulationState.hospitalLocations[id];
      console.log(`🏥 Hospital desconectado: ${id}`);
      
      // Notificar a operadores
      broadcastToType('operators', {
        type: 'hospital_disconnected',
        hospitalId: id,
        timestamp: new Date().toISOString()
      });
      return;
    }
  }
  
  // Buscar y eliminar en operadores
  for (const [id, client] of Object.entries(connectedClients.operators)) {
    if (client === ws) {
      delete connectedClients.operators[id];
      console.log(`👨‍💼 Operador desconectado: ${id}`);
      return;
    }
  }
}

// Endpoint HTTP para geocoding
app.post('/geocode', express.json(), async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    // Simulación de geocoding
    const mockResults = [
      {
        place_name: address,
        center: [-101.1969, 19.7024],
        lat: 19.7024,
        lng: -101.1969,
        region: 'Michoacán',
        municipality: 'Morelia'
      },
      {
        place_name: 'Hospital General Morelia',
        center: [-101.1923, 19.7045],
        lat: 19.7045,
        lng: -101.1923,
        region: 'Michoacán',
        municipality: 'Morelia'
      }
    ];
    
    // Seleccionar resultado aleatorio o el primero
    const result = mockResults[Math.floor(Math.random() * mockResults.length)];
    
    res.json(result);
  } catch (error) {
    console.error('Error en geocoding:', error);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// Endpoint para obtener estado del sistema
app.get('/system-status', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    stats: {
      ambulances: Object.keys(connectedClients.ambulances).length,
      hospitals: Object.keys(connectedClients.hospitals).length,
      operators: Object.keys(connectedClients.operators).length,
      activeRoutes: Object.keys(simulationState.activeRoutes).length
    },
    activeRoutes: simulationState.activeRoutes
  });
});

// Endpoint para simular nueva emergencia
app.post('/simulate-emergency', (req, res) => {
  simulateNewEmergency();
  res.json({ success: true, message: 'Emergency simulation triggered' });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor WebSocket ejecutándose en puerto ${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`   Geocoding: http://localhost:${PORT}/geocode (POST)`);
  console.log(`   Status: http://localhost:${PORT}/system-status`);
  console.log(`   Simular emergencia: http://localhost:${PORT}/simulate-emergency (POST)`);
});