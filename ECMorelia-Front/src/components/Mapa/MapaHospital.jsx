import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  ChakraProvider, 
  theme, 
  Box, 
  Button, 
  VStack, 
  Text, 
  HStack, 
  Badge, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  useDisclosure, 
  Input, 
  Textarea,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Grid,
  GridItem,
  useToast
} from "@chakra-ui/react";

// Configuración de Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiZWR1YXJkbzI1MGplbW0iLCJhIjoiY2xwYzVvdzc3MDNlYjJoazUzbzZsYjRwNiJ9.KsDXLdjWn2R4fMX-YIIU8g';

function MapaHospital() {
  const [map, setMap] = useState(null);
  const [activeAmbulances, setActiveAmbulances] = useState([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [patientNotifications, setPatientNotifications] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null); // Nueva: ruta activa
  
  // Modals
  const { isOpen: isNoteOpen, onOpen: onNoteOpen, onClose: onNoteClose } = useDisclosure();
  const { isOpen: isNotificationOpen, onOpen: onNotificationOpen, onClose: onNotificationClose } = useDisclosure();
  
  const [noteMessage, setNoteMessage] = useState('');
  const [patientInfo, setPatientInfo] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const toast = useToast();
  
  // Información del hospital
  const [hospitalInfo] = useState({
    id: 'HOSP-001',
    nombre: 'Clínica ISSSTE',
    ubicacion: 'Morelia, Michoacán',
    lat: 19.72833,
    lng: -101.18061,
    especialidades: ['Urgencias', 'Traumatología', 'Cardiología'],
    camasDisponibles: 15,
    telefono: '+52 443 123 4567'
  });

  const mapContainer = useRef(null);
  const ws = useRef(null);
  const ambulanceMarkers = useRef({});
  const hospitalMarker = useRef(null);
  const routeLayerIds = useRef([]); // Nueva: IDs de capas de ruta
  const reconnectTimeout = useRef(null);

  // Inicializar WebSocket con reconexión automática
  const connectWebSocket = () => {
    try {
      console.log('🏥 Conectando hospital al WebSocket...');
      
      ws.current = new WebSocket('ws://localhost:3002/ws');
      
      ws.current.onopen = () => {
        console.log('✅ Hospital conectado al servidor WebSocket');
        setWsConnected(true);
        
        // Enviar información del hospital al registrarse
        ws.current.send(JSON.stringify({
          type: 'register_hospital',
          hospital: hospitalInfo
        }));

        showToast('success', 'Conectado al servidor', 'Hospital registrado correctamente');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Mensaje recibido en hospital:', data.type);
          
          switch (data.type) {
            case 'connection_established':
              console.log('✅ Conexión WebSocket confirmada');
              break;
              
            case 'active_ambulances_update':
              setActiveAmbulances(data.ambulances || []);
              updateAmbulanceMarkers(data.ambulances || []);
              break;
              
            case 'location_update':
              updateAmbulanceLocation(data);
              break;
              
            case 'navigation_started':
            case 'navigation_finished':
              updateAmbulanceStatus(data);
              break;
            
            // Manejar notificaciones de traslado de pacientes
            case 'patient_transfer_notification':
              console.log('🚨 Notificación de traslado recibida:', data);
              
              // Crear notificación con datos completos
              const notificationData = {
                ...data,
                timestamp: new Date().toLocaleString(),
                id: data.notificationId || `notif_${Date.now()}`
              };
              
              setPatientNotifications(prev => [...prev, notificationData]);
              setSelectedNotification(notificationData);
              
              // Mostrar información detallada en consola para debugging
              console.log('📋 Información del paciente recibida:', {
                paciente: data.patientInfo,
                ambulancia: data.ambulanceInfo,
                eta: data.eta,
                distancia: data.distance,
                hasRoute: !!data.routeGeometry
              });

              // Si hay geometría de ruta, mostrarla en el mapa
              if (data.routeGeometry && map) {
                displayRouteOnMap(data.routeGeometry, data.eta, data.distance);
                setActiveRoute({
                  ambulanceId: data.ambulanceId,
                  eta: data.eta,
                  distance: data.distance,
                  geometry: data.routeGeometry
                });
              }
              
              // Mostrar toast de notificación
              showToast(
                'info', 
                'Nuevo paciente en camino', 
                `Ambulancia ${data.ambulanceInfo?.id} se dirige al hospital - ETA: ${data.eta} min`
              );
              
              onNotificationOpen();
              break;

            // Nueva: Actualización de ruta
            case 'route_update':
              console.log('🔄 Actualización de ruta recibida:', data);
              if (data.routeGeometry && map) {
                displayRouteOnMap(data.routeGeometry, data.eta, data.distance);
                setActiveRoute({
                  ambulanceId: data.ambulanceId,
                  eta: data.eta,
                  distance: data.distance,
                  geometry: data.routeGeometry
                });
              }
              break;
              
            case 'patient_accepted':
              if (data.hospitalId === hospitalInfo.id) {
                console.log('✅ Paciente aceptado por este hospital');
                // Remover notificación aceptada
                setPatientNotifications(prev => 
                  prev.filter(notif => notif.notificationId !== data.notificationId)
                );
                showToast('success', 'Paciente aceptado', 'Se ha confirmado la recepción del paciente');
              }
              break;
              
            case 'error':
              console.error('❌ Error del servidor:', data.message);
              showToast('error', 'Error', data.message);
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
        
        if (event.code !== 1000) {
          console.log('🔄 Intentando reconexión en 3 segundos...');
          showToast('warning', 'Conexión perdida', 'Reconectando...');
          
          reconnectTimeout.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ Error WebSocket:', error);
        setWsConnected(false);
        showToast('error', 'Error de conexión', 'No se pudo conectar al servidor');
      };

    } catch (error) {
      console.error('❌ Error al conectar WebSocket:', error);
    }
  };

  // Función para mostrar toasts
  const showToast = (status, title, description) => {
    toast({
      title,
      description,
      status,
      duration: 4000,
      isClosable: true,
      position: 'top-right'
    });
  };

  // Nueva: Función para mostrar ruta en el mapa
  const displayRouteOnMap = (routeGeometry, eta, distance) => {
    if (!map) return;

    // Limpiar ruta anterior
    clearRouteFromMap();

    const routeId = 'hospital-route';
    const routeColor = '#00FFFC';

    // Agregar fuente de la ruta
    map.addSource(routeId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: routeGeometry,
        },
        properties: {}
      },
    });

    // Capa principal de la ruta
    map.addLayer({
      id: routeId,
      type: 'line',
      source: routeId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': routeColor,
        'line-width': 6,
        'line-opacity': 0.9,
        'line-blur': 0.2,
      },
    });

    // Efecto de brillo
    map.addLayer({
      id: routeId + '-glow',
      type: 'line',
      source: routeId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': routeColor,
        'line-width': 12,
        'line-opacity': 0.4,
        'line-blur': 1.5
      },
    }, routeId);

    // Contorno
    map.addLayer({
      id: routeId + '-outline',
      type: 'line',
      source: routeId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#FFFFFF',
        'line-width': 10,
        'line-opacity': 0.2,
        'line-blur': 0.8
      },
    }, routeId + '-glow');

    // Guardar IDs de las capas
    routeLayerIds.current = [
      routeId,
      routeId + '-glow',
      routeId + '-outline'
    ];

    console.log('🗺️ Ruta mostrada en el mapa del hospital');
  };

  // Nueva: Función para limpiar ruta del mapa
  const clearRouteFromMap = () => {
    if (!map) return;
    
    routeLayerIds.current.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(layerId)) {
        map.removeSource(layerId);
      }
    });
    
    routeLayerIds.current = [];
    setActiveRoute(null);
  };

  // Nueva: Función para ajustar el mapa para mostrar toda la ruta
  const fitMapToRoute = (routeGeometry) => {
    if (!map || !routeGeometry) return;

    const bounds = new mapboxgl.LngLatBounds();
    
    // Extender bounds con todos los puntos de la ruta
    routeGeometry.forEach(coord => {
      bounds.extend([coord[0], coord[1]]);
    });
    
    // También incluir la ubicación del hospital
    bounds.extend([hospitalInfo.lng, hospitalInfo.lat]);

    map.fitBounds(bounds, {
      padding: 100,
      duration: 2000,
      pitch: 45
    });
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

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [hospitalInfo.lng, hospitalInfo.lat],
      zoom: 12,
    });

    mapInstance.addControl(new mapboxgl.NavigationControl());

    mapInstance.on('load', () => {
      setMap(mapInstance);
      addHospitalMarker(mapInstance);
    });

    return () => {
      mapInstance.remove();
    };
  }, []);

  // Agregar marcador del hospital
  const addHospitalMarker = (mapInstance) => {
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        width: 50px;
        height: 50px;
        background: #4caf50;
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">🏥</div>
    `;
    el.style.cursor = 'pointer';

    hospitalMarker.current = new mapboxgl.Marker(el)
      .setLngLat([hospitalInfo.lng, hospitalInfo.lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 12px; max-width: 250px;">
            <strong style="font-size: 16px;">🏥 ${hospitalInfo.nombre}</strong><br/>
            <div style="margin: 8px 0;">
              <strong>📍 Ubicación:</strong> ${hospitalInfo.ubicacion}<br/>
              <strong>📞 Teléfono:</strong> ${hospitalInfo.telefono}<br/>
              <strong>🛏️ Camas disponibles:</strong> ${hospitalInfo.camasDisponibles}<br/>
              <strong>🏥 Especialidades:</strong> ${hospitalInfo.especialidades.join(', ')}
            </div>
            <em style="color: #666; font-size: 12px;">Hospital registrado y operativo</em>
          </div>
        `))
      .addTo(map);
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
              ${activeRoute && activeRoute.ambulanceId === ambulance.id ? `
              <br/><strong>📊 Ruta activa:</strong><br/>
              🕐 ${activeRoute.eta} min<br/>
              📏 ${activeRoute.distance} km
              ` : ''}
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
          ? { ...amb, location: data.location, speed: data.speed }
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
    wrapper.innerHTML = `
      <div style="
        width: 45px;
        height: 45px;
        background: #ff4444;
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 20px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      ">🚑</div>
    `;
    wrapper.style.cursor = 'pointer';
    wrapper.style.transformOrigin = 'center center';
    
    return wrapper;
  };

  // Aceptar paciente
  const acceptPatient = (notification) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'hospital_accept_patient',
        notificationId: notification.notificationId,
        hospitalId: hospitalInfo.id,
        hospitalInfo: hospitalInfo
      }));

      // Remover notificación
      setPatientNotifications(prev => 
        prev.filter(notif => notif.notificationId !== notification.notificationId)
      );
      
      showToast('success', 'Paciente aceptado', 'Se ha confirmado la recepción del paciente');
      onNotificationClose();
    } else {
      showToast('error', 'Error', 'No hay conexión con el servidor');
    }
  };

  // Rechazar paciente
  const rejectPatient = (notification) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'hospital_reject_patient',
        notificationId: notification.notificationId,
        hospitalId: hospitalInfo.id,
        reason: 'Capacidad limitada - No hay camas disponibles'
      }));

      // Remover notificación
      setPatientNotifications(prev => 
        prev.filter(notif => notif.notificationId !== notification.notificationId)
      );
      
      // Limpiar ruta si se rechaza
      clearRouteFromMap();
      
      showToast('warning', 'Paciente rechazado', 'Se ha notificado a la ambulancia');
      onNotificationClose();
    } else {
      showToast('error', 'Error', 'No hay conexión con el servidor');
    }
  };

  // Enviar nota al conductor
  const sendNoteToDriver = () => {
    if (!selectedAmbulance || !noteMessage.trim()) {
      showToast('warning', 'Advertencia', 'Escribe un mensaje para el conductor');
      return;
    }

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'hospital_note',
        ambulanceId: selectedAmbulance.id,
        hospitalId: hospitalInfo.id,
        note: {
          id: Date.now(),
          message: noteMessage,
          patientInfo: patientInfo,
          hospitalInfo: hospitalInfo,
          timestamp: new Date().toLocaleTimeString()
        }
      }));

      showToast('success', 'Nota enviada', 'Mensaje enviado al conductor de la ambulancia');
    } else {
      showToast('error', 'Error', 'No hay conexión con el servidor');
    }

    setNoteMessage('');
    setPatientInfo('');
    onNoteClose();
  };

  // Reconectar manualmente
  const reconnectWebSocket = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    connectWebSocket();
  };

  // Nueva: Solicitar actualización de ruta
  const requestRouteUpdate = (ambulanceId) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'request_route_update',
        ambulanceId: ambulanceId
      }));
    }
  };

  return (
    <ChakraProvider theme={theme}>
      <Box height="100vh" display="flex" flexDirection="column">
        {/* Header */}
        <Box bg="blue.600" color="white" p={4} boxShadow="md">
          <HStack justifyContent="space-between">
            <VStack align="start" spacing={0}>
              <Text fontSize="xl" fontWeight="bold">
                🏥 {hospitalInfo.nombre}
              </Text>
              <Text fontSize="sm" opacity={0.9}>
                Centro de Control Hospitalario - Monitoreo de Ambulancias
                <Badge ml={2} colorScheme={wsConnected ? "green" : "red"} fontSize="xs">
                  {wsConnected ? "Conectado" : "Desconectado"}
                </Badge>
              </Text>
            </VStack>
            <HStack spacing={4}>
              <Badge colorScheme="green" fontSize="md" p={2}>
                {activeAmbulances.length} Ambulancias Activas
              </Badge>
              {activeRoute && (
                <Badge colorScheme="purple" fontSize="md" p={2}>
                  🕐 {activeRoute.eta} min • 📏 {activeRoute.distance} km
                </Badge>
              )}
              {patientNotifications.length > 0 && (
                <Badge colorScheme="red" fontSize="md" p={2} cursor="pointer" onClick={onNotificationOpen}>
                  {patientNotifications.length} Notificaciones
                </Badge>
              )}
              <Button 
                size="sm" 
                colorScheme={wsConnected ? "green" : "orange"} 
                onClick={reconnectWebSocket}
              >
                {wsConnected ? "✅ Conectado" : "🔌 Reconectar"}
              </Button>
            </HStack>
          </HStack>
        </Box>

        {/* Contenido principal */}
        <Box flex={1} display="flex">
          {/* Panel lateral */}
          <Box width="400px" bg="gray.50" p={4} overflowY="auto" boxShadow="md">
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
                    {activeRoute && activeRoute.ambulanceId === ambulance.id && (
                      <Box mt={2} p={2} bg="blue.50" borderRadius="md">
                        <Text fontSize="sm" fontWeight="bold" color="blue.700">
                          📊 Ruta Activa
                        </Text>
                        <Text fontSize="sm" color="blue.600">
                          🕐 {activeRoute.eta} min • 📏 {activeRoute.distance} km
                        </Text>
                      </Box>
                    )}
                  </Box>
                ))}
              </VStack>
            )}

            {/* Información de ruta activa */}
            {activeRoute && (
              <Box mt={6} p={4} bg="white" borderRadius="md" border="1px" borderColor="gray.200">
                <Text fontSize="lg" fontWeight="bold" mb={2} color="gray.700">
                  📊 Ruta Activa
                </Text>
                <VStack align="start" spacing={1}>
                  <Text><strong>Ambulancia:</strong> {activeRoute.ambulanceId}</Text>
                  <Text><strong>Tiempo estimado:</strong> {activeRoute.eta} minutos</Text>
                  <Text><strong>Distancia:</strong> {activeRoute.distance} km</Text>
                </VStack>
                <Button 
                  size="sm" 
                  colorScheme="blue" 
                  width="100%" 
                  mt={3}
                  onClick={() => activeRoute.geometry && fitMapToRoute(activeRoute.geometry)}
                >
                  🗺️ Ajustar mapa a ruta
                </Button>
              </Box>
            )}

            {/* Botones de acción */}
            {selectedAmbulance && (
              <VStack spacing={3} mt={6}>
                <Button 
                  colorScheme="blue" 
                  width="100%" 
                  onClick={onNoteOpen}
                  disabled={!wsConnected}
                >
                  📋 Enviar Nota al Conductor
                </Button>
                {activeRoute && activeRoute.ambulanceId === selectedAmbulance.id && (
                  <Button 
                    colorScheme="purple" 
                    width="100%" 
                    onClick={() => requestRouteUpdate(selectedAmbulance.id)}
                    disabled={!wsConnected}
                  >
                    🔄 Actualizar Ruta
                  </Button>
                )}
              </VStack>
            )}
          </Box>

          {/* Mapa */}
          <Box flex={1} position="relative">
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
            
            {/* Información de ruta en el mapa */}
            {activeRoute && (
              <Box
                position="absolute"
                top="20px"
                left="20px"
                bg="rgba(255,255,255,0.95)"
                p={3}
                borderRadius="md"
                boxShadow="lg"
                maxWidth="300px"
                zIndex="1"
              >
                <Text fontWeight="bold" mb={2} color="gray.700">
                  📊 Ruta Activa - {activeRoute.ambulanceId}
                </Text>
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm"><strong>🕐 ETA:</strong> {activeRoute.eta} minutos</Text>
                  <Text fontSize="sm"><strong>📏 Distancia:</strong> {activeRoute.distance} km</Text>
                  <Text fontSize="sm"><strong>🏥 Destino:</strong> {hospitalInfo.nombre}</Text>
                </VStack>
                <Button 
                  size="xs" 
                  colorScheme="blue" 
                  mt={2}
                  onClick={() => fitMapToRoute(activeRoute.geometry)}
                >
                  🗺️ Ajustar vista
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Modal para enviar mensajes */}
      <Modal isOpen={isNoteOpen} onClose={onNoteClose}>
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
            <Button variant="ghost" mr={3} onClick={onNoteClose}>
              Cancelar
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={sendNoteToDriver}
              disabled={!wsConnected}
            >
              📤 Enviar Nota
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal para notificaciones de paciente */}
      <Modal isOpen={isNotificationOpen} onClose={onNotificationClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="blue.500" color="white">
            🚨 Notificación de Traslado de Paciente
          </ModalHeader>
          <ModalBody>
            {selectedNotification && (
              <VStack spacing={4} align="stretch">
                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Ambulancia en camino!</AlertTitle>
                    <AlertDescription>
                      {selectedNotification.ambulanceInfo?.id} - {selectedNotification.ambulanceInfo?.placa}
                    </AlertDescription>
                  </Box>
                </Alert>

                <Grid templateColumns="1fr 1fr" gap={4}>
                  <GridItem>
                    <Text fontWeight="bold" mb={2}>Información del Paciente:</Text>
                    <VStack align="start" spacing={1}>
                      <Text><strong>Edad:</strong> {selectedNotification.patientInfo?.age || 'No especificada'}</Text>
                      <Text><strong>Sexo:</strong> {selectedNotification.patientInfo?.sex || 'No especificado'}</Text>
                      <Text><strong>Emergencia:</strong> {selectedNotification.patientInfo?.type || 'No especificada'}</Text>
                      {selectedNotification.patientInfo?.timestamp && (
                        <Text fontSize="sm" color="gray.600">
                          Reportado: {selectedNotification.patientInfo.timestamp}
                        </Text>
                      )}
                    </VStack>
                  </GridItem>
                  
                  <GridItem>
                    <Text fontWeight="bold" mb={2}>Información del Traslado:</Text>
                    <VStack align="start" spacing={1}>
                      <Text><strong>ETA:</strong> {selectedNotification.eta || 'Calculando...'}</Text>
                      <Text><strong>Distancia:</strong> {selectedNotification.distance || 'Calculando...'}</Text>
                      <Text><strong>Ambulancia:</strong> {selectedNotification.ambulanceInfo?.placa}</Text>
                      <Text><strong>Tipo:</strong> {selectedNotification.ambulanceInfo?.tipo}</Text>
                    </VStack>
                  </GridItem>
                </Grid>

                <Box bg="blue.50" p={3} borderRadius="md" borderLeft="4px" borderColor="blue.500">
                  <Text fontSize="sm" fontWeight="bold" color="blue.700">
                    Tiempo estimado de llegada:
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color="blue.800">
                    {selectedNotification.eta || 'Calculando...'} minutos
                  </Text>
                  <Text fontSize="sm" color="blue.600">
                    Distancia: {selectedNotification.distance || 'Calculando...'} km
                  </Text>
                  <Button 
                    size="sm" 
                    colorScheme="blue" 
                    mt={2}
                    onClick={() => selectedNotification.routeGeometry && fitMapToRoute(selectedNotification.routeGeometry)}
                  >
                    🗺️ Ver ruta en el mapa
                  </Button>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button 
              colorScheme="red" 
              variant="outline" 
              mr={3} 
              onClick={() => rejectPatient(selectedNotification)}
              disabled={!wsConnected}
            >
              Rechazar Paciente
            </Button>
            <Button 
              colorScheme="green" 
              onClick={() => acceptPatient(selectedNotification)}
              disabled={!wsConnected}
            >
              ✅ Aceptar Paciente
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ChakraProvider>
  );
}

export default MapaHospital;