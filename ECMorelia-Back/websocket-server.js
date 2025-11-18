const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server, 
  path: '/ws',
  perMessageDeflate: false
});

// Almacenamiento en memoria
const activeAmbulances = new Map();
const activeHospitals = new Map();
const pendingNotifications = new Map();
const activeRoutes = new Map(); // Nuevo: para almacenar rutas activas

// Middleware para permitir CORS
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

// Manejar preflight requests
app.options('*', (req, res) => {
  res.sendStatus(200);
});

wss.on('connection', (ws, req) => {
  console.log('✅ Nueva conexión WebSocket establecida');
  
  // Enviar mensaje de bienvenida
  ws.send(JSON.stringify({
    type: 'connection_established',
    message: 'Conexión WebSocket establecida correctamente',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Mensaje recibido:', data.type);
      handleMessage(ws, data);
    } catch (error) {
      console.error('❌ Error procesando mensaje WebSocket:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Formato de mensaje JSON inválido' 
      }));
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 Conexión WebSocket cerrada: ${code} - ${reason}`);
    
    // Limpiar hospitales desconectados
    for (let [hospitalId, hospitalData] of activeHospitals.entries()) {
      if (hospitalData.ws === ws) {
        activeHospitals.delete(hospitalId);
        console.log(`🏥 Hospital ${hospitalId} desconectado`);
        broadcastActiveHospitals();
        break;
      }
    }
    
    // Encontrar y remover ambulancia desconectada
    for (let [ambulanceId, ambulanceData] of activeAmbulances.entries()) {
      if (ambulanceData.ws === ws) {
        activeAmbulances.delete(ambulanceId);
        // Limpiar ruta asociada
        activeRoutes.delete(ambulanceId);
        console.log(`🚑 Ambulancia ${ambulanceId} desconectada`);
        broadcastActiveAmbulances();
        break;
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Error en WebSocket:', error);
  });
});

// Heartbeat para mantener conexiones activas
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString()
      }));
    }
  });
}, 30000);

function handleMessage(ws, data) {
  switch (data.type) {
    case 'register_ambulance':
      if (!data.ambulance || !data.ambulance.id) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Datos de ambulancia incompletos'
        }));
        return;
      }

      activeAmbulances.set(data.ambulance.id, {
        ...data.ambulance,
        ws: ws,
        location: null,
        status: 'disponible',
        lastUpdate: new Date()
      });
      
      console.log(`🚑 Ambulancia registrada: ${data.ambulance.id}`);
      
      // Enviar lista de hospitales activos a la ambulancia
      const hospitalsList = Array.from(activeHospitals.values()).map(hospital => ({
        id: hospital.info.id,
        name: hospital.info.nombre,
        lat: hospital.info.lat,
        lng: hospital.info.lng,
        ubicacion: hospital.info.ubicacion,
        especialidades: hospital.info.especialidades || [],
        camasDisponibles: hospital.info.camasDisponibles || 0,
        connected: true
      }));
      
      ws.send(JSON.stringify({
        type: 'active_hospitals_update',
        hospitals: hospitalsList,
        message: `Lista de ${hospitalsList.length} hospitales activos`
      }));
      
      broadcastActiveAmbulances();
      break;

    case 'register_hospital':
      if (!data.hospital || !data.hospital.id) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Datos de hospital incompletos. Se requiere al menos el ID.'
        }));
        return;
      }

      // Datos por defecto para hospital
      const hospitalInfo = {
        id: data.hospital.id,
        nombre: data.hospital.nombre || `Hospital ${data.hospital.id}`,
        ubicacion: data.hospital.ubicacion || 'Ubicación no especificada',
        lat: data.hospital.lat || 19.7024,
        lng: data.hospital.lng || -101.1969,
        especialidades: data.hospital.especialidades || ['General'],
        camasDisponibles: data.hospital.camasDisponibles || 10,
        telefono: data.hospital.telefono || '',
        connectedAt: new Date()
      };

      activeHospitals.set(hospitalInfo.id, {
        ws: ws,
        info: hospitalInfo,
        connectedAt: new Date()
      });
      
      // Enviar lista actual de ambulancias al hospital
      const ambulancesList = Array.from(activeAmbulances.entries()).map(([id, ambulance]) => ({
        id: ambulance.id,
        placa: ambulance.placa,
        tipo: ambulance.tipo,
        status: ambulance.status,
        location: ambulance.location,
        speed: ambulance.speed,
        lastUpdate: ambulance.lastUpdate
      }));
      
      ws.send(JSON.stringify({
        type: 'active_ambulances_update',
        ambulances: ambulancesList,
        hospitalInfo: hospitalInfo,
        message: `Registro exitoso. ${ambulancesList.length} ambulancias activas`
      }));
      
      console.log(`🏥 Hospital registrado: ${hospitalInfo.nombre} (${hospitalInfo.id})`);
      
      // Notificar a todas las ambulancias sobre el nuevo hospital
      broadcastActiveHospitals();
      break;

    case 'location_update':
      const ambulanceData = activeAmbulances.get(data.ambulanceId);
      if (ambulanceData) {
        ambulanceData.location = data.location;
        ambulanceData.speed = data.speed;
        ambulanceData.status = data.status || ambulanceData.status;
        ambulanceData.lastUpdate = new Date();
        
        broadcastToHospitals({
          type: 'location_update',
          ambulanceId: data.ambulanceId,
          location: data.location,
          speed: data.speed,
          status: ambulanceData.status,
          timestamp: new Date().toISOString()
        });
      }
      break;

    case 'patient_transfer_notification':
      const ambulance = activeAmbulances.get(data.ambulanceId);
      if (ambulance && data.hospitalId) {
        // Verificar que el hospital esté conectado
        const targetHospital = activeHospitals.get(data.hospitalId);
        if (!targetHospital) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Hospital no encontrado o desconectado'
          }));
          return;
        }

        // Guardar notificación pendiente
        const notificationId = `notif_${Date.now()}`;
        pendingNotifications.set(notificationId, {
          id: notificationId,
          ambulanceId: data.ambulanceId,
          hospitalId: data.hospitalId,
          patientInfo: data.patientInfo || {},
          eta: data.eta || 'Calculando...',
          distance: data.distance || 'Calculando...',
          routeGeometry: data.routeGeometry || null, // Nueva: geometría de la ruta
          timestamp: new Date()
        });

        // Guardar información de la ruta
        if (data.routeGeometry) {
          activeRoutes.set(data.ambulanceId, {
            ambulanceId: data.ambulanceId,
            hospitalId: data.hospitalId,
            routeGeometry: data.routeGeometry,
            distance: data.distance,
            eta: data.eta,
            timestamp: new Date()
          });
        }

        console.log('📋 Datos de paciente recibidos:', {
          patientInfo: data.patientInfo,
          eta: data.eta,
          distance: data.distance,
          hasRoute: !!data.routeGeometry
        });

        // Enviar notificación al hospital específico
        broadcastToHospitalById(data.hospitalId, {
          type: 'patient_transfer_notification',
          notificationId: notificationId,
          ambulanceId: data.ambulanceId,
          ambulanceInfo: {
            id: ambulance.id,
            placa: ambulance.placa,
            tipo: ambulance.tipo
          },
          patientInfo: data.patientInfo || {},
          eta: data.eta || 'Calculando...',
          distance: data.distance || 'Calculando...',
          routeGeometry: data.routeGeometry || null, // Nueva: enviar geometría de la ruta
          timestamp: new Date().toISOString()
        });
        
        console.log(`📋 Notificación de traslado enviada al hospital ${data.hospitalId}`);
        
        // Confirmar al operador
        ws.send(JSON.stringify({
          type: 'notification_sent',
          hospitalId: data.hospitalId,
          hospitalName: targetHospital.info.nombre,
          message: `Notificación enviada a ${targetHospital.info.nombre} correctamente`
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'No se pudo enviar la notificación. Ambulancia u hospital no válidos.'
        }));
      }
      break;

    case 'hospital_accept_patient':
      const notification = pendingNotifications.get(data.notificationId);
      if (notification) {
        const targetAmbulance = activeAmbulances.get(notification.ambulanceId);
        if (targetAmbulance && targetAmbulance.ws.readyState === WebSocket.OPEN) {
          targetAmbulance.ws.send(JSON.stringify({
            type: 'patient_accepted',
            notificationId: data.notificationId,
            hospitalId: data.hospitalId,
            hospitalInfo: data.hospitalInfo,
            message: 'Hospital ha aceptado al paciente. Proceda con el traslado.',
            timestamp: new Date().toISOString()
          }));
          
          console.log(`✅ Paciente aceptado por hospital ${data.hospitalId} para ambulancia ${notification.ambulanceId}`);
        }
        pendingNotifications.delete(data.notificationId);
      }
      break;

    case 'hospital_reject_patient':
      const rejectNotification = pendingNotifications.get(data.notificationId);
      if (rejectNotification) {
        const targetAmbulance = activeAmbulances.get(rejectNotification.ambulanceId);
        if (targetAmbulance && targetAmbulance.ws.readyState === WebSocket.OPEN) {
          targetAmbulance.ws.send(JSON.stringify({
            type: 'patient_rejected',
            notificationId: data.notificationId,
            hospitalId: data.hospitalId,
            reason: data.reason || 'No especificado',
            message: 'Hospital no puede aceptar al paciente. Busque otro hospital.',
            timestamp: new Date().toISOString()
          }));
          
          console.log(`❌ Paciente rechazado por hospital ${data.hospitalId}`);
        }
        pendingNotifications.delete(data.notificationId);
      }
      break;

    case 'hospital_note':
      const targetAmbulance = activeAmbulances.get(data.ambulanceId);
      const hospitalData = activeHospitals.get(data.hospitalId);
      
      if (targetAmbulance && targetAmbulance.ws.readyState === WebSocket.OPEN) {
        targetAmbulance.ws.send(JSON.stringify({
          type: 'hospital_note',
          note: {
            ...data.note,
            hospitalInfo: hospitalData?.info || {}
          }
        }));
        console.log(`💌 Nota enviada a ambulancia ${data.ambulanceId}`);
      }
      break;

    case 'request_hospitals_list':
      // Enviar lista de hospitales activos al solicitante
      const activeHospitalsList = Array.from(activeHospitals.values()).map(hospital => ({
        id: hospital.info.id,
        name: hospital.info.nombre,
        lat: hospital.info.lat,
        lng: hospital.info.lng,
        ubicacion: hospital.info.ubicacion,
        especialidades: hospital.info.especialidades || [],
        camasDisponibles: hospital.info.camasDisponibles || 0,
        connected: true
      }));
      
      ws.send(JSON.stringify({
        type: 'active_hospitals_update',
        hospitals: activeHospitalsList,
        message: `${activeHospitalsList.length} hospitales conectados`
      }));
      break;

    case 'request_route_update':
      // Enviar actualización de ruta específica
      const routeData = activeRoutes.get(data.ambulanceId);
      if (routeData) {
        ws.send(JSON.stringify({
          type: 'route_update',
          ambulanceId: data.ambulanceId,
          routeGeometry: routeData.routeGeometry,
          distance: routeData.distance,
          eta: routeData.eta,
          timestamp: routeData.timestamp
        }));
      }
      break;

    case 'ping':
      // Responder a ping para mantener conexión activa
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
      break;

    default:
      console.log('⚠️ Tipo de mensaje no reconocido:', data.type);
      ws.send(JSON.stringify({
        type: 'error',
        message: `Tipo de mensaje no reconocido: ${data.type}`
      }));
  }
}

function broadcastToHospitals(message) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  activeHospitals.forEach((hospitalData, hospitalId) => {
    if (hospitalData.ws.readyState === WebSocket.OPEN) {
      hospitalData.ws.send(messageStr);
      sentCount++;
    }
  });
  
  console.log(`📤 Mensaje broadcast a ${sentCount} hospitales: ${message.type}`);
}

function broadcastToAmbulances(message) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  activeAmbulances.forEach((ambulanceData, ambulanceId) => {
    if (ambulanceData.ws.readyState === WebSocket.OPEN) {
      ambulanceData.ws.send(messageStr);
      sentCount++;
    }
  });
  
  console.log(`📤 Mensaje broadcast a ${sentCount} ambulancias: ${message.type}`);
}

function broadcastToHospitalById(hospitalId, message) {
  const messageStr = JSON.stringify(message);
  const hospitalData = activeHospitals.get(hospitalId);
  if (hospitalData && hospitalData.ws.readyState === WebSocket.OPEN) {
    hospitalData.ws.send(messageStr);
    console.log(`📤 Mensaje enviado a hospital ${hospitalId}: ${message.type}`);
  } else {
    console.log(`❌ No se pudo enviar mensaje a hospital ${hospitalId} - Desconectado`);
  }
}

function broadcastActiveHospitals() {
  const hospitalsList = Array.from(activeHospitals.values()).map(hospital => ({
    id: hospital.info.id,
    name: hospital.info.nombre,
    lat: hospital.info.lat,
    lng: hospital.info.lng,
    ubicacion: hospital.info.ubicacion,
    especialidades: hospital.info.especialidades || [],
    camasDisponibles: hospital.info.camasDisponibles || 0,
    connected: true
  }));

  broadcastToAmbulances({
    type: 'active_hospitals_update',
    hospitals: hospitalsList,
    timestamp: new Date().toISOString()
  });
}

function broadcastActiveAmbulances() {
  const ambulancesList = Array.from(activeAmbulances.entries()).map(([id, ambulance]) => ({
    id: ambulance.id,
    placa: ambulance.placa,
    tipo: ambulance.tipo,
    status: ambulance.status,
    location: ambulance.location,
    speed: ambulance.speed,
    lastUpdate: ambulance.lastUpdate
  }));

  broadcastToHospitals({
    type: 'active_ambulances_update',
    ambulances: ambulancesList,
    timestamp: new Date().toISOString()
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeAmbulances: activeAmbulances.size,
    activeHospitals: activeHospitals.size,
    pendingNotifications: pendingNotifications.size,
    activeRoutes: activeRoutes.size,
    uptime: process.uptime()
  });
});

// Endpoint para obtener hospitales activos
app.get('/hospitals', (req, res) => {
  const hospitalsList = Array.from(activeHospitals.values()).map(hospital => ({
    id: hospital.info.id,
    nombre: hospital.info.nombre,
    ubicacion: hospital.info.ubicacion,
    lat: hospital.info.lat,
    lng: hospital.info.lng,
    especialidades: hospital.info.especialidades,
    camasDisponibles: hospital.info.camasDisponibles,
    connectedAt: hospital.connectedAt
  }));
  
  res.json({ 
    hospitals: hospitalsList,
    total: hospitalsList.length
  });
});

// Endpoint para obtener estado del sistema
app.get('/status', (req, res) => {
  res.json({
    server: 'running',
    websocket: {
      clients: wss.clients.size,
      ambulances: activeAmbulances.size,
      hospitals: activeHospitals.size,
      activeRoutes: activeRoutes.size
    },
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.WS_PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 Servidor WebSocket ejecutándose en puerto ${PORT}`);
  console.log(`📡 Endpoint WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🏥 API Hospitales: http://localhost:${PORT}/hospitals`);
  console.log(`📊 Estado del sistema: http://localhost:${PORT}/status`);
});

module.exports = { wss, activeAmbulances, activeHospitals, pendingNotifications, activeRoutes };