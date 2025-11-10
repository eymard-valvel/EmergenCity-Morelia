import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChakraProvider, theme, Box, Button, VStack, Text, HStack, Badge, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input, Textarea } from "@chakra-ui/react";

// Configuración de Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiZWR1YXJkbzI1MGplbW0iLCJhIjoiY2xwYzVvdzc3MDNlYjJoazUzbzZsYjRwNiJ9.KsDXLdjWn2R4fMX-YIIU8g';

function MapaHospital() {
  const [map, setMap] = useState(null);
  const [activeAmbulances, setActiveAmbulances] = useState([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [noteMessage, setNoteMessage] = useState('');
  const [patientInfo, setPatientInfo] = useState('');
  const [emergencyAddress, setEmergencyAddress] = useState('');
  const [hospitalLocation, setHospitalLocation] = useState(null);
  
  // Información del hospital
  const [hospitalInfo] = useState({
    id: 'HOSP-001',
    nombre: 'Hospital Star Medica',
    ubicacion: 'Morelia, Michoacán',
    lat: 19.682937,
    lng: -101.191438
  });

  const mapContainer = useRef(null);
  const ws = useRef(null);
  const ambulanceMarkers = useRef({});
  const hospitalMarker = useRef(null);

  // Inicializar WebSocket
  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8081');
    
    ws.current.onopen = () => {
      console.log('Hospital conectado al servidor WebSocket');
      
      // Enviar información del hospital al registrarse
      ws.current.send(JSON.stringify({
        type: 'register_hospital',
        hospital: hospitalInfo
      }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'active_ambulances_update':
          setActiveAmbulances(data.ambulances);
          updateAmbulanceMarkers(data.ambulances);
          break;
        case 'location_update':
          updateAmbulanceLocation(data);
          break;
        case 'navigation_started':
        case 'navigation_finished':
          updateAmbulanceStatus(data);
          break;
        case 'patient_accepted':
          if (data.hospitalId === hospitalInfo.id) {
            console.log('Paciente aceptado por este hospital');
          }
          break;
        default:
          console.log('Mensaje recibido:', data);
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [hospitalInfo]);

  // Inicializar mapa
  useEffect(() => {
    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [hospitalInfo.lng, hospitalInfo.lat],
      zoom: 12,
    });

    mapInstance.addControl(new mapboxgl.NavigationControl());

    mapInstance.on('load', () => {
      setMap(mapInstance);
      // Agregar marcador del hospital
      addHospitalMarker(mapInstance);
    });

    return () => {
      mapInstance.remove();
    };
  }, []);

  // Agregar marcador del hospital
  const addHospitalMarker = (mapInstance) => {
    const el = document.createElement('div');
    el.style.backgroundImage = 'url(/hospital.png)';
    el.style.width = '50px';
    el.style.height = '50px';
    el.style.backgroundSize = 'cover';
    el.style.borderRadius = '50%';
    el.style.cursor = 'pointer';
    el.style.boxShadow = '0 0 10px 4px rgba(0,255,0,0.4)';

    hospitalMarker.current = new mapboxgl.Marker(el)
      .setLngLat([hospitalInfo.lng, hospitalInfo.lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 8px;">
            <strong>🏥 ${hospitalInfo.nombre}</strong><br/>
            Ubicación: ${hospitalInfo.ubicacion}<br/>
            <em>Hospital registrado</em>
          </div>
        `))
      .addTo(mapInstance);
  };

  // Actualizar marcadores de ambulancias
  const updateAmbulanceMarkers = (ambulances) => {
    if (!map) return;

    // Limpiar marcadores antiguos
    Object.values(ambulanceMarkers.current).forEach(marker => marker.remove());
    ambulanceMarkers.current = {};

    // Crear nuevos marcadores
    ambulances.forEach(ambulance => {
      if (ambulance.location) {
        const el = createAmbulanceMarkerElement(ambulance);
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([ambulance.location.lng, ambulance.location.lat])
          .addTo(map);

        // Popup de información
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div style="padding: 8px;">
              <strong>🚑 ${ambulance.id}</strong><br/>
              Placa: ${ambulance.placa}<br/>
              Tipo: ${ambulance.tipo}<br/>
              Estado: <span style="color: ${ambulance.status === 'en_ruta' ? '#4caf50' : '#ff9800'}">${ambulance.status === 'en_ruta' ? 'EN RUTA' : 'DISPONIBLE'}</span><br/>
              Velocidad: ${ambulance.speed || 0} km/h
            </div>
          `);

        marker.setPopup(popup);
        ambulanceMarkers.current[ambulance.id] = marker;
      }
    });
  };

  // Actualizar ubicación de ambulancia específica
  const updateAmbulanceLocation = (data) => {
    const marker = ambulanceMarkers.current[data.ambulanceId];
    if (marker && data.location) {
      marker.setLngLat([data.location.lng, data.location.lat]);
      
      // Rotar marcador según heading
      const el = marker.getElement();
      if (el) {
        el.style.transform = `rotate(${data.location.heading || 0}deg)`;
      }

      // Actualizar estado local
      setActiveAmbulances(prev => prev.map(amb => 
        amb.id === data.ambulanceId 
          ? { ...amb, location: data.location, speed: data.location.speed }
          : amb
      ));
    }
  };

  // Actualizar estado de ambulancia
  const updateAmbulanceStatus = (data) => {
    setActiveAmbulances(prev => prev.map(amb => 
      amb.id === data.ambulanceId 
        ? { ...amb, status: data.status }
        : amb
    ));
  };

  // Crear elemento de marcador para ambulancia
  const createAmbulanceMarkerElement = (ambulance) => {
    const wrapper = document.createElement('div');
    wrapper.style.backgroundImage = 'url(/ambulancia.png)';
    wrapper.style.width = '45px';
    wrapper.style.height = '45px';
    wrapper.style.backgroundSize = 'cover';
    wrapper.style.borderRadius = '50%';
    wrapper.style.cursor = 'pointer';
    wrapper.style.boxShadow = '0 0 8px 3px rgba(255,0,0,0.4)';
    wrapper.style.transformOrigin = 'center center';
    
    return wrapper;
  };

  // Enviar nota al conductor
  const sendNoteToDriver = () => {
    if (!selectedAmbulance || !noteMessage.trim()) return;

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'hospital_note',
        ambulanceId: selectedAmbulance.id,
        note: {
          id: Date.now(),
          message: noteMessage,
          patientInfo: patientInfo,
          hospitalInfo: hospitalInfo,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    }

    setNoteMessage('');
    setPatientInfo('');
    onClose();
  };

  // Aceptar paciente y enviar ruta al hospital
  const acceptPatientAndSendRoute = () => {
    if (!selectedAmbulance) return;

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'hospital_accept_patient',
        ambulanceId: selectedAmbulance.id,
        hospital: hospitalInfo,
        message: `${hospitalInfo.nombre} acepta al paciente. Ruta calculada automáticamente.`,
        timestamp: new Date().toLocaleTimeString()
      }));
    }

    onClose();
  };

  return (
    <ChakraProvider theme={theme}>
      <Box height="100vh" display="flex" flexDirection="column">
        {/* Header */}
        <Box bg="red.600" color="white" p={4} boxShadow="md">
          <HStack justifyContent="space-between">
            <VStack align="start" spacing={0}>
              <Text fontSize="xl" fontWeight="bold">
                🏥 {hospitalInfo.nombre}
              </Text>
              <Text fontSize="sm" opacity={0.9}>
                Centro de Control Hospitalario - Monitoreo de Ambulancias
              </Text>
            </VStack>
            <Badge colorScheme="green" fontSize="md" p={2}>
              {activeAmbulances.length} Ambulancias Activas
            </Badge>
          </HStack>
        </Box>

        {/* Contenido principal */}
        <Box flex={1} display="flex">
          {/* Panel lateral */}
          <Box width="350px" bg="gray.50" p={4} overflowY="auto" boxShadow="md">
            <Text fontSize="lg" fontWeight="bold" mb={4} color="gray.700">
              🚑 Ambulancias Activas
            </Text>

            {activeAmbulances.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>
                No hay ambulancias activas
              </Text>
            ) : (
              <VStack spacing={3} align="stretch">
                {activeAmbulances.map(ambulance => (
                  <Box 
                    key={ambulance.id}
                    p={3} 
                    border="1px" 
                    borderColor="gray.200" 
                    borderRadius="md" 
                    bg="white"
                    cursor="pointer"
                    onClick={() => setSelectedAmbulance(ambulance)}
                    boxShadow={selectedAmbulance?.id === ambulance.id ? "outline" : "sm"}
                    transition="all 0.2s"
                  >
                    <HStack justifyContent="space-between" mb={2}>
                      <Text fontWeight="bold" color="red.600">{ambulance.id}</Text>
                      <Badge colorScheme={ambulance.status === 'en_ruta' ? 'green' : 'orange'}>
                        {ambulance.status === 'en_ruta' ? 'EN RUTA' : 'DISPONIBLE'}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600">Placa: {ambulance.placa}</Text>
                    <Text fontSize="sm" color="gray.600">Tipo: {ambulance.tipo}</Text>
                    {ambulance.location && (
                      <Text fontSize="sm" color="gray.600">
                        Velocidad: {Math.round(ambulance.speed || 0)} km/h
                      </Text>
                    )}
                  </Box>
                ))}
              </VStack>
            )}

            {/* Botones de acción */}
            {selectedAmbulance && (
              <VStack spacing={3} mt={6}>
                <Button 
                  colorScheme="blue" 
                  width="100%" 
                  onClick={() => {
                    setNoteMessage('');
                    setPatientInfo('');
                    onOpen();
                  }}
                >
                  📋 Enviar Nota al Conductor
                </Button>
                <Button 
                  colorScheme="green" 
                  width="100%"
                  onClick={acceptPatientAndSendRoute}
                >
                  ✅ Aceptar Paciente y Enviar Ruta
                </Button>
              </VStack>
            )}
          </Box>

          {/* Mapa */}
          <Box flex={1} position="relative">
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
          </Box>
        </Box>
      </Box>

      {/* Modal para enviar mensajes */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            📋 Enviar Nota al Conductor
          </ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                Para: {selectedAmbulance?.id} - {selectedAmbulance?.placa}
              </Text>
              
              <Textarea
                placeholder="Escribe tu mensaje para el conductor..."
                value={noteMessage}
                onChange={(e) => setNoteMessage(e.target.value)}
                rows={3}
              />
              
              <Textarea
                placeholder="Información del paciente (opcional)"
                value={patientInfo}
                onChange={(e) => setPatientInfo(e.target.value)}
                rows={2}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={sendNoteToDriver}
            >
              📤 Enviar Nota
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ChakraProvider>
  );
}

export default MapaHospital;