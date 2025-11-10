const express = require('express')
const app = express()
const cors = require('cors')
const { swaggerUi, swaggerDocs } = require('./config/swagger')
const cookieParser = require('cookie-parser')
const WebSocket = require('ws');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const dotenv = require('dotenv')
dotenv.config()

const seed = require('./routes/seed.js')
const auth = require('./routes/auth.js')
const ambulancia = require('./routes/ambulancias.js')
const paramedico = require('./routes/paramedico.js')
const hospital = require('./routes/hospital.js')
const operador = require('./routes/operador.js')
const doctor = require('./routes/doctor.js')
const reportePrehospitalario= require('./routes/reportePrehospitalario.js');

const corsOptions = {
  origin: (origin, callback) => callback(null, true),
  credentials: true
};

const PORT = process.env.PORT || 3000

// ==================== CONFIGURACIÓN WEBSOCKET MEJORADA ====================
const wss = new WebSocket.Server({ port: 8081 });

// Almacenamiento para el sistema de ambulancias
const activeAmbulances = new Map();
const hospitals = new Set();

wss.on('connection', (ws, req) => {
  console.log('🔌 Cliente WebSocket conectado');

  // Manejo de mensajes del sistema de ambulancias
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleAmbulanceMessage(ws, data);
    } catch (error) {
      console.error('❌ Error procesando mensaje WebSocket:', error);
      
      // También maneja mensajes de texto plano (para compatibilidad con Python)
      if (typeof message === 'string') {
        console.log('📨 Mensaje de texto recibido:', message);
        // Reenvía a todos los clientes (compatibilidad con sistema existente)
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    }
  });

  ws.on('close', () => {
    console.log('🔌 Cliente WebSocket desconectado');
    // Limpiar del sistema de ambulancias
    hospitals.delete(ws);
    
    for (let [ambulanceId, ambulanceData] of activeAmbulances.entries()) {
      if (ambulanceData.ws === ws) {
        activeAmbulances.delete(ambulanceId);
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

// ==================== MANEJO DE MENSAJES DE AMBULANCIAS ====================
function handleAmbulanceMessage(ws, data) {
  console.log('📨 Mensaje recibido:', data.type);
  
  switch (data.type) {
    case 'register_ambulance':
      activeAmbulances.set(data.ambulance.id, {
        ...data.ambulance,
        ws: ws,
        location: null,
        status: 'disponible',
        lastUpdate: new Date()
      });
      
      console.log(`🚑 Ambulancia registrada: ${data.ambulance.id}`);
      broadcastActiveAmbulances();
      break;

    case 'register_hospital':
      hospitals.add(ws);
      
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
        ambulances: ambulancesList
      }));
      
      console.log('🏥 Hospital registrado');
      break;

    case 'location_update':
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
      const targetAmbulance = activeAmbulances.get(data.ambulanceId);
      if (targetAmbulance && targetAmbulance.ws.readyState === WebSocket.OPEN) {
        targetAmbulance.ws.send(JSON.stringify({
          type: 'hospital_note',
          note: data.note
        }));
        console.log(`📋 Nota enviada a ambulancia ${data.ambulanceId}`);
      }
      break;

    case 'emergency_assignment':
      const emergencyAmbulance = activeAmbulances.get(data.ambulanceId);
      if (emergencyAmbulance && emergencyAmbulance.ws.readyState === WebSocket.OPEN) {
        emergencyAmbulance.ws.send(JSON.stringify({
          type: 'emergency_assignment',
          emergency: data.emergency
        }));
        
        emergencyAmbulance.status = 'en_ruta';
        console.log(`🚨 Emergencia asignada a ambulancia ${data.ambulanceId}`);
        broadcastActiveAmbulances();
      }
      break;

    case 'navigation_started':
      const startedAmbulance = activeAmbulances.get(data.ambulanceId);
      if (startedAmbulance) {
        startedAmbulance.status = 'en_ruta';
        broadcastActiveAmbulances();
      }
      break;

    case 'navigation_finished':
      const finishedAmbulance = activeAmbulances.get(data.ambulanceId);
      if (finishedAmbulance) {
        finishedAmbulance.status = 'disponible';
        broadcastActiveAmbulances();
      }
      break;

    case 'note_accepted':
      console.log(`✅ Nota ${data.noteId} aceptada por ambulancia ${data.ambulanceId}`);
      break;

    default:
      console.log('❓ Tipo de mensaje no reconocido:', data.type);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Tipo de mensaje no reconocido'
      }));
  }
}

function broadcastToHospitals(message) {
  const messageStr = JSON.stringify(message);
  hospitals.forEach(hospitalWs => {
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

// ==================== MIDDLEWARE Y RUTAS EXISTENTES ====================
app.use(express.json())
app.use(cookieParser())
app.use(cors(corsOptions))

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))
app.use('/seed', seed)
app.use('/auth', auth)
app.use('/ambulancias', ambulancia)
app.use('/paramedico', paramedico)
app.use('/hospital', hospital)
app.use('/operador', operador)
app.use('/doctor', doctor)
app.use('/reporte-prehospitalario', reportePrehospitalario);

// ==================== RUTAS WEBSOCKET PARA AMBULANCIAS ====================
app.get('/api/ambulances/active', (req, res) => {
  const ambulancesList = Array.from(activeAmbulances.entries()).map(([id, ambulance]) => ({
    id: ambulance.id,
    placa: ambulance.placa,
    tipo: ambulance.tipo,
    status: ambulance.status,
    location: ambulance.location,
    speed: ambulance.speed,
    lastUpdate: ambulance.lastUpdate
  }));
  
  res.json({
    success: true,
    data: ambulancesList,
    total: ambulancesList.length
  });
});

app.get('/api/ambulances/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeAmbulances: activeAmbulances.size,
    activeHospitals: hospitals.size,
    timestamp: new Date().toISOString()
  });
});

// ==================== RUTA EXISTENTE PARA PYTHON (MANTENER COMPATIBILIDAD) ====================
app.post('/api/pacientes', async (req, res) => {
  try {
    const { seccion, datos } = req.body;

    console.log('📨 Datos recibidos desde Python:', { seccion, datos });

    // Envía los datos a través de WebSockets a todos los clientes conectados
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ seccion, datos }));
      }
    });

    res.status(200).json({ 
      success: true,
      message: 'Datos recibidos y enviados a WebSocket' 
    });
  } catch (error) {
    console.error('❌ Error al enviar datos:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al enviar datos' 
    });
  }
});

// ==================== RUTA PRINCIPAL ====================
app.get('/', (req, res) => {
  res.json({
    message: '🚑 ECMorelia Backend API',
    version: '1.0.0',
    endpoints: {
      docs: '/docs',
      ambulances: '/api/ambulances/active',
      health: '/api/ambulances/health'
    }
  })
})

// ==================== INICIO DEL SERVIDOR ====================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Servidor ECMorelia ejecutándose en puerto ${PORT}`)
  console.log(`📡 WebSocket Server en puerto 8081`)
  console.log(`📚 Documentación: http://localhost:${PORT}/docs`)
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/ambulances/health`)
  console.log(`🚑 Ambulancias activas: http://localhost:${PORT}/api/ambulances/active\n`)
})