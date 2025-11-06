const express = require('express')
const app = express()
const cors = require('cors')
const { swaggerUi, swaggerDocs } = require('./config/swagger')
const cookieParser = require('cookie-parser')
const WebSocket = require('ws');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Instancia de PrismaClient


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

/*
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Lista de orígenes permitidos
  credentials: true, // Permitir cookies y encabezados con credenciales
};
*/
const corsOptions = {
  origin: (origin, callback) => callback(null, true),
  credentials: true
};



const PORT = process.env.PORT || 3000

// Configuración de WebSocket
const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', (ws) => {
  console.log('Cliente conectado');
});

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



wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  // Envía un mensaje de prueba al cliente cuando se conecta
  ws.send(JSON.stringify({ tipo: 'prueba', mensaje: 'Conexión establecida correctamente' }));

  ws.on('message', (message) => {
    console.log('Mensaje recibido del cliente (incluyendo Python):', message);
    // Envía el mensaje recibido a todos los clientes conectados
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message); // Reenvía el mensaje a los clientes
      }
    });
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});


// Ruta para recibir datos desde el script de Python
app.post('/api/pacientes', async (req, res) => {
  try {
    const { seccion, datos } = req.body;

    // Agrega un log para verificar los datos antes de enviarlos
    console.log('Enviando datos a WebSocket:', { seccion, datos });

    // Envía los datos a través de WebSockets a todos los clientes conectados
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ seccion, datos }));
      }
    });

    res.status(200).json({ message: 'Datos recibidos y enviados a WebSocket' });
  } catch (error) {
    console.error('Error al enviar datos:', error);
    res.status(500).send('Error al enviar datos');
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Hello world'
  })
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running in port ${PORT}`)
})
