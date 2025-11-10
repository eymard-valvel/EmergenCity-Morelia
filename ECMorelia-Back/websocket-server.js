const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server, 
  path: '/ws' 
});

// Almacenamiento en memoria (puedes migrar a PostgreSQL después)
const activeAmbulances = new Map();
const hospitals = new Map(); // Cambiar de Set a Map para guardar más información

// Middleware para permitir CORS si es necesario
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

wss.on('connection', (ws, req) => {
  console.log('Nueva conexión WebSocket establecida');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error('Error procesando mensaje WebSocket:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Formato de mensaje inválido' 
      }));
    }
  });

  ws.on('close', () => {
    console.log('Conexión WebSocket cerrada');
    
    // Limpiar hospitales desconectados
    hospitals.delete(ws);
    
    // Encontrar y remover ambulancia desconectada
    for (let [ambulanceId, ambulanceData] of activeAmbulances.entries()) {
      if (ambulanceData.ws === ws) {
        activeAmbulances.delete(ambulanceId);
        console.log(`Ambulancia ${ambulanceId} desconectada`);
        broadcastActiveAmbulances();
        break;
      }
    }
  });

  ws.on('error', (error) => {
    console.error('Error en WebSocket:', error);
  });
});

function handleMessage(ws, data) {
  console.log('Mensaje recibido:', data.type);
  
  switch (data.type) {
    case 'register_ambulance':
      activeAmbulances.set(data.ambulance.id, {
        ...data.ambulance,
        ws: ws,
        location: null,
        status: 'disponible',
        lastUpdate: new Date()
      });
      
      console.log(`Ambulancia registrada: ${data.ambulance.id}`);
      broadcastActiveAmbulances();
      break;

    case 'register_hospital':
      // MODIFICADO: Guardar información completa del hospital
      hospitals.set(ws, {
        ws: ws,
        info: data.hospital || {},
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
        hospitalInfo: data.hospital // Enviar info de confirmación
      }));
      
      console.log(`Hospital registrado: ${data.hospital?.nombre || 'Sin nombre'}`);
      break;

    case 'location_update':
      // Actualizar ubicación de ambulancia
      const ambulanceData = activeAmbulances.get(data.ambulanceId);
      if (ambulanceData) {
        ambulanceData.location = data.location;
        ambulanceData.speed = data.speed;
        ambulanceData.status = data.status || ambulanceData.status;
        ambulanceData.lastUpdate = new Date();
        
        // Broadcast ubicación a hospitales
        broadcastToHospitals({
          type: 'location_update',
          ambulanceId: data.ambulanceId,
          location: data.location,
          speed: data.speed,
          status: ambulanceData.status
        });
      }
      break;

    case 'hospital_note':
      // MODIFICADO: Enviar nota a ambulancia específica con info del hospital
      const targetAmbulance = activeAmbulances.get(data.ambulanceId);
      const hospitalData = hospitals.get(ws);
      
      if (targetAmbulance && targetAmbulance.ws.readyState === WebSocket.OPEN) {
        targetAmbulance.ws.send(JSON.stringify({
          type: 'hospital_note',
          note: {
            ...data.note,
            hospitalInfo: hospitalData?.info || {} // Agregar info del hospital
          }
        }));
        console.log(`Nota enviada a ambulancia ${data.ambulanceId} desde ${hospitalData?.info?.nombre || 'hospital'}`);
      }
      break;

    case 'emergency_assignment':
      // MODIFICADO: Asignar emergencia a ambulancia con info del hospital
      const emergencyAmbulance = activeAmbulances.get(data.ambulanceId);
      const assigningHospital = hospitals.get(ws);
      
      if (emergencyAmbulance && emergencyAmbulance.ws.readyState === WebSocket.OPEN) {
        emergencyAmbulance.ws.send(JSON.stringify({
          type: 'emergency_assignment',
          emergency: {
            ...data.emergency,
            hospitalInfo: assigningHospital?.info || {} // Agregar info del hospital
          }
        }));
        
        // Actualizar estado de la ambulancia
        emergencyAmbulance.status = 'en_ruta';
        
        console.log(`Emergencia asignada a ambulancia ${data.ambulanceId} desde ${assigningHospital?.info?.nombre || 'hospital'}`);
        broadcastActiveAmbulances();
      }
      break;

    case 'navigation_started':
      // Actualizar estado cuando inicia navegación
      const startedAmbulance = activeAmbulances.get(data.ambulanceId);
      if (startedAmbulance) {
        startedAmbulance.status = 'en_ruta';
        broadcastActiveAmbulances();
      }
      break;

    case 'navigation_finished':
      // Actualizar estado cuando finaliza navegación
      const finishedAmbulance = activeAmbulances.get(data.ambulanceId);
      if (finishedAmbulance) {
        finishedAmbulance.status = 'disponible';
        broadcastActiveAmbulances();
      }
      break;

    case 'note_accepted':
      // Confirmar que el conductor aceptó la nota
      console.log(`Nota ${data.noteId} aceptada por ambulancia ${data.ambulanceId}`);
      break;

    default:
      console.log('Tipo de mensaje no reconocido:', data.type);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Tipo de mensaje no reconocido'
      }));
  }
}

// MODIFICAR función broadcastToHospitals para usar el Map
function broadcastToHospitals(message) {
  const messageStr = JSON.stringify(message);
  hospitals.forEach((hospitalData, hospitalWs) => {
    if (hospitalWs.readyState === WebSocket.OPEN) {
      hospitalWs.send(messageStr);
    }
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
    ambulances: ambulancesList
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeAmbulances: activeAmbulances.size,
    activeHospitals: hospitals.size
  });
});

const PORT = process.env.WS_PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 Servidor WebSocket ejecutándose en puerto ${PORT}`);
  console.log(`📡 Endpoint WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

module.exports = { wss, activeAmbulances, hospitals };