// MapaHospitalOptimizado.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  ChakraProvider,
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
  Textarea,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Card,
  CardBody,
  Progress,
  Input,
  Select,
  Spinner
} from "@chakra-ui/react";

mapboxgl.accessToken = 'pk.eyJ1IjoiZWR1YXJkbzI1MGplbW0iLCJhIjoiY2xwYzVvdzc3MDNlYjJoazUzbzZsYjRwNiJ9.KsDXLdjWn2R4fMX-YIIU8g';

export default function MapaHospitalOptimizado() {
  // Refs
  const mapContainer = useRef(null);
  const map = useRef(null);
  const ws = useRef(null);
  const hospitalMarker = useRef(null);
  const ambulanceMarkers = useRef({});
  const routeLayerIds = useRef([]);
  const reconnectTimeout = useRef(null);
  const connectionAttempts = useRef(0);
  const maxConnectionAttempts = 5;
  const isMounted = useRef(true);

  // Estado principal
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [ambulances, setAmbulances] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Notificaciones y modales
  const [patientNotifications, setPatientNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  
  const { isOpen: isNoteOpen, onOpen: onNoteOpen, onClose: onNoteClose } = useDisclosure();
  const { isOpen: isNotificationOpen, onOpen: onNotificationOpen, onClose: onNotificationClose } = useDisclosure();
  
  const [noteMessage, setNoteMessage] = useState("");
  const [patientInfo, setPatientInfo] = useState("");

  const toast = useToast();

  // ---------- WEBSOCKET CONNECTION MEJORADA ----------
  const connectWebSocket = useCallback(() => {
    if (!isMounted.current || isConnecting || connectionAttempts.current >= maxConnectionAttempts) {
      return;
    }

    try {
      if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      console.log('🏥 Conectando hospital al WebSocket...');
      setIsConnecting(true);
      connectionAttempts.current += 1;

      ws.current = new WebSocket('ws://localhost:3002/ws');

      ws.current.onopen = () => {
        if (!isMounted.current) return;
        
        console.log('✅ Hospital conectado al servidor WebSocket');
        setWsConnected(true);
        setIsConnecting(false);
        connectionAttempts.current = 0;
        
        // Registrar hospital cuando la info esté disponible
        if (hospitalInfo) {
          registerHospital();
        }
        
        showToast('success', 'Sistema Conectado', 'Hospital conectado al servidor central');
      };

      ws.current.onmessage = (event) => {
        if (!isMounted.current) return;
        
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Mensaje recibido en hospital:', data.type);

          switch (data.type) {
            case 'connection_established':
              console.log('✅ Conexión WebSocket confirmada');
              break;

            case 'active_ambulances_update':
              console.log('🚑 Ambulancias actualizadas:', data.ambulances.length);
              setAmbulances(data.ambulances || []);
              updateAmbulanceMarkers(data.ambulances || []);
              break;

            case 'location_update':
              handleAmbulanceLocationUpdate(data);
              break;

            case 'patient_transfer_notification':
              handlePatientTransferNotification(data);
              break;

            case 'route_update':
              if (data.routeGeometry) {
                drawRouteOnMap(data.routeGeometry);
                setActiveRoute({
                  ambulanceId: data.ambulanceId,
                  geometry: data.routeGeometry,
                  distance: data.distance,
                  duration: data.duration
                });
              }
              break;

            case 'navigation_cancelled':
              handleNavigationCancelled(data);
              break;

            case 'patient_accepted':
              if (data.hospitalId === hospitalInfo?.id) {
                setPatientNotifications(prev => 
                  prev.filter(n => n.notificationId !== data.notificationId)
                );
                showToast('success', 'Paciente Aceptado', 'Traslado confirmado - Preparar recepción');
              }
              break;

            case 'patient_rejected':
              if (data.hospitalId === hospitalInfo?.id) {
                setPatientNotifications(prev => 
                  prev.filter(n => n.notificationId !== data.notificationId)
                );
                clearRoute();
                showToast('warning', 'Paciente Rechazado', 'Se ha notificado a la ambulancia');
              }
              break;

            case 'error':
              showToast('error', 'Error del Sistema', data.message);
              break;

            default:
              console.log('📨 Mensaje no manejado:', data.type);
          }
        } catch (error) {
          console.error('❌ Error procesando mensaje:', error);
        }
      };

      ws.current.onclose = (event) => {
        if (!isMounted.current) return;
        
        console.log('🔌 WebSocket cerrado:', event.code, event.reason);
        setWsConnected(false);
        setIsConnecting(false);

        if (event.code !== 1000 && connectionAttempts.current < maxConnectionAttempts) {
          showToast('warning', 'Conexión Perdida', 'Reconectando automáticamente...');
          reconnectTimeout.current = setTimeout(() => {
            connectWebSocket();
          }, 5000); // Aumentado a 5 segundos
        } else if (connectionAttempts.current >= maxConnectionAttempts) {
          showToast('error', 'Error de Conexión', 'No se pudo conectar después de varios intentos');
        }
      };

      ws.current.onerror = (error) => {
        if (!isMounted.current) return;
        
        console.error('❌ Error WebSocket:', error);
        setWsConnected(false);
        setIsConnecting(false);
        showToast('error', 'Error de Conexión', 'Verifique la conexión al servidor');
      };

    } catch (error) {
      console.error('❌ Error al conectar WebSocket:', error);
      setIsConnecting(false);
    }
  }, [hospitalInfo, isConnecting]);

  // ---------- HOSPITAL REGISTRATION CON GEOCODING MEJORADO ----------
  const registerHospital = useCallback(() => {
    if (!hospitalInfo || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Solo registrar si tenemos coordenadas válidas
    if (hospitalInfo.lat && hospitalInfo.lng) {
      ws.current.send(JSON.stringify({
        type: 'register_hospital',
        hospital: hospitalInfo
      }));

      console.log('🏥 Hospital registrado con coordenadas:', hospitalInfo.nombre);
    } else {
      console.error('❌ No se puede registrar hospital sin coordenadas válidas');
    }
  }, [hospitalInfo]);

  // ---------- HOSPITAL DATA LOADING MEJORADO ----------
  useEffect(() => {
    isMounted.current = true;

    const loadHospitalData = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem("hospitalInfo") || "null");
        
        if (!stored || !stored.id) {
          showToast('error', 'Configuración Requerida', 'Complete la información del hospital en el sistema');
          return;
        }

        let hospitalData = {
          id: stored.id,
          nombre: stored.nombre || "Hospital",
          direccion: stored.direccion || "",
          lat: stored.lat,
          lng: stored.lng,
          especialidades: stored.especialidades || ['General'],
          camasDisponibles: stored.camasDisponibles || 10,
          telefono: stored.telefono || ''
        };

        // Solo forzar geocoding si no tenemos coordenadas válidas
        if (hospitalData.direccion && (!hospitalData.lat || !hospitalData.lng)) {
          showToast('info', 'Verificando Ubicación', 'Validando coordenadas del hospital...');
          
          const verifiedCoords = await geocodeHospitalAddress(hospitalData.direccion);
          hospitalData.lat = verifiedCoords.lat;
          hospitalData.lng = verifiedCoords.lng;

          // Actualizar localStorage con coordenadas corregidas
          localStorage.setItem("hospitalInfo", JSON.stringify({
            ...stored,
            lat: verifiedCoords.lat,
            lng: verifiedCoords.lng
          }));
        }

        if (isMounted.current) {
          setHospitalInfo(hospitalData);
          showToast('success', 'Hospital Configurado', `${hospitalData.nombre} listo para recibir pacientes`);
        }

      } catch (error) {
        console.error('❌ Error cargando datos del hospital:', error);
        showToast('error', 'Error de Configuración', 'No se pudieron cargar los datos del hospital');
      }
    };

    loadHospitalData();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // ---------- GEOCODING MEJORADO ----------
  const geocodeHospitalAddress = async (address) => {
    if (!address) {
      return { lat: 19.7024, lng: -101.1969 };
    }

    try {
      const response = await fetch('http://localhost:3002/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: address + ', Morelia, Michoacán' })
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.lat && result.lng) {
          console.log('✅ Hospital geocoded correctamente:', result.place_name);
          return { lat: result.lat, lng: result.lng };
        }
      }
    } catch (error) {
      console.error('❌ Error en geocoding hospital:', error);
    }

    return { lat: 19.7024, lng: -101.1969 };
  };

  // ---------- MAP INITIALIZATION ----------
  useEffect(() => {
    if (!hospitalInfo || !mapContainer.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [hospitalInfo.lng, hospitalInfo.lat],
      zoom: 15,
      pitch: 45
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapInstance.on('load', () => {
      console.log('🗺️ Mapa del hospital cargado');
      map.current = mapInstance;
      
      // Colocar marcador del hospital
      placeHospitalMarker();
      
      // Agregar capas
      if (trafficEnabled) {
        addTrafficLayer();
      }
      add3DBuildings();
    });

    map.current = mapInstance;

    return () => {
      cleanupMarkers();
      try { 
        if (mapInstance) mapInstance.remove(); 
      } catch (e) {}
    };
  }, [hospitalInfo]);

  // ---------- WEBSOCKET LIFECYCLE ----------
  useEffect(() => {
    if (hospitalInfo) {
      // Esperar un poco antes de conectar para evitar bucles
      const timeoutId = setTimeout(() => {
        connectWebSocket();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [hospitalInfo, connectWebSocket]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        try {
          ws.current.close(1000, 'Componente desmontado');
        } catch (e) {}
      }
    };
  }, []);

  // ---------- MAP LAYERS ----------
  const addTrafficLayer = () => {
    if (!map.current) return;

    try {
      if (!map.current.getSource('mapbox-traffic')) {
        map.current.addSource('mapbox-traffic', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1'
        });
      }

      if (!map.current.getLayer('traffic-layer-hospital')) {
        map.current.addLayer({
          id: 'traffic-layer-hospital',
          type: 'line',
          source: 'mapbox-traffic',
          'source-layer': 'traffic',
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'congestion'], 'low'], '#00C853',
              ['==', ['get', 'congestion'], 'moderate'], '#FF9100',
              ['==', ['get', 'congestion'], 'heavy'], '#FF3D00',
              '#00C853'
            ],
            'line-width': 4,
            'line-opacity': 0.7
          }
        }, 'waterway-label');
      }
    } catch (error) {
      console.warn('No se pudo agregar capa de tráfico:', error);
    }
  };

  const add3DBuildings = () => {
    if (!map.current) return;

    try {
      const layers = map.current.getStyle().layers;
      const labelLayerId = layers.find(layer => layer.type === 'symbol' && layer.layout['text-field'])?.id;

      if (map.current.getSource('composite')) {
        map.current.addLayer({
          id: '3d-buildings-hospital',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#BDBDBD',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.6
          }
        }, labelLayerId);
      }
    } catch (error) {
      console.warn('No se pudo agregar edificios 3D:', error);
    }
  };

  const toggleTraffic = () => {
    if (!map.current) return;

    if (trafficEnabled) {
      if (map.current.getLayer('traffic-layer-hospital')) {
        map.current.removeLayer('traffic-layer-hospital');
      }
      setTrafficEnabled(false);
      showToast('info', 'Tráfico', 'Capa de tráfico desactivada');
    } else {
      addTrafficLayer();
      setTrafficEnabled(true);
      showToast('info', 'Tráfico', 'Capa de tráfico activada');
    }
  };

  // ---------- MARKER MANAGEMENT ----------
  const placeHospitalMarker = () => {
    if (!map.current || !hospitalInfo) return;

    try {
      if (hospitalMarker.current) {
        hospitalMarker.current.remove();
      }

      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          width: 70px; height: 70px; background: linear-gradient(135deg, #2E7D32, #1B5E20);
          border: 4px solid white; border-radius: 50%; display: flex; align-items: center; 
          justify-content: center; color: white; font-weight: bold; font-size: 28px; 
          box-shadow: 0 8px 25px rgba(46,125,50,0.3); cursor: pointer;
        ">🏥</div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 16px; max-width: 320px; font-family: Arial, sans-serif;">
            <strong style="font-size: 18px; color: #2E7D32;">${hospitalInfo.nombre}</strong>
            <div style="margin: 12px 0; font-size: 14px; color: #555;">
              <div><strong>📍 Dirección:</strong> ${hospitalInfo.direccion}</div>
              <div><strong>📞 Teléfono:</strong> ${hospitalInfo.telefono || 'No disponible'}</div>
              <div><strong>🛏️ Camas disponibles:</strong> ${hospitalInfo.camasDisponibles}</div>
              <div><strong>🏥 Especialidades:</strong> ${hospitalInfo.especialidades.join(', ')}</div>
            </div>
            <em style="color: #888; font-size: 12px;">Centro médico operativo - Sistema de emergencias</em>
          </div>
        `);

      hospitalMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([hospitalInfo.lng, hospitalInfo.lat])
        .setPopup(popup)
        .addTo(map.current);

    } catch (error) {
      console.error('❌ Error colocando marcador del hospital:', error);
    }
  };

  const updateAmbulanceMarkers = (ambulancesList) => {
    if (!map.current) return;

    // Limpiar marcadores antiguos
    Object.values(ambulanceMarkers.current).forEach(marker => {
      try { marker.remove(); } catch (e) {}
    });
    ambulanceMarkers.current = {};

    ambulancesList.forEach(ambulance => {
      if (!ambulance.location || !ambulance.location.lat || !ambulance.location.lng) return;

      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          width: 55px; height: 55px; background: linear-gradient(135deg, #D32F2F, #B71C1C);
          border: 3px solid white; border-radius: 50%; display: flex; align-items: center; 
          justify-content: center; color: white; font-weight: bold; font-size: 22px; 
          box-shadow: 0 4px 15px rgba(211,47,47,0.3); cursor: pointer;
        ">🚑</div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 12px; max-width: 260px; font-family: Arial, sans-serif;">
            <strong style="font-size: 16px; color: #D32F2F;">🚑 ${ambulance.id}</strong>
            <div style="margin: 8px 0; font-size: 14px; color: #555;">
              <div>📋 Placa: ${ambulance.placa || 'N/A'}</div>
              <div>🔧 Tipo: ${ambulance.tipo || 'N/A'}</div>
              <div>📊 Estado: ${ambulance.status === 'en_ruta' ? 'EN RUTA' : 'DISPONIBLE'}</div>
              <div>💨 Velocidad: ${ambulance.speed || 0} km/h</div>
            </div>
            <button onclick="window.selectAmbulanceFromMap('${ambulance.id}')"
              style="width: 100%; padding: 8px 12px; background: #2196F3; color: white;
              border: none; border-radius: 6px; cursor: pointer; margin-top: 8px; font-size: 12px;
              box-shadow: 0 2px 6px rgba(33,150,243,0.3);">
              👁️ Seguir Ambulancia
            </button>
          </div>
        `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([ambulance.location.lng, ambulance.location.lat])
        .setPopup(popup)
        .addTo(map.current);

      ambulanceMarkers.current[ambulance.id] = marker;

      el.addEventListener('click', () => {
        setSelectedAmbulance(ambulance);
        showToast('info', 'Ambulancia Seleccionada', ambulance.id);
      });
    });

    // Función global para selección desde popup
    window.selectAmbulanceFromMap = (ambulanceId) => {
      const ambulance = ambulancesList.find(a => a.id === ambulanceId);
      if (ambulance) {
        setSelectedAmbulance(ambulance);
        showToast('info', 'Ambulancia Seleccionada', ambulance.id);
        
        // Centrar en la ambulancia
        if (ambulance.location) {
          map.current.flyTo({
            center: [ambulance.location.lng, ambulance.location.lat],
            zoom: 15,
            duration: 1000
          });
        }
      }
    };
  };

  const handleAmbulanceLocationUpdate = (data) => {
    if (!data.ambulanceId || !data.location) return;

    const marker = ambulanceMarkers.current[data.ambulanceId];
    if (marker) {
      // Actualizar posición del marcador
      marker.setLngLat([data.location.lng, data.location.lat]);
      
      // Actualizar estado local
      setAmbulances(prev => prev.map(amb => 
        amb.id === data.ambulanceId 
          ? { ...amb, location: data.location, speed: data.speed, heading: data.heading }
          : amb
      ));
    }
  };

  const cleanupMarkers = () => {
    if (hospitalMarker.current) {
      hospitalMarker.current.remove();
      hospitalMarker.current = null;
    }
    
    Object.values(ambulanceMarkers.current).forEach(marker => {
      try { marker.remove(); } catch (e) {}
    });
    ambulanceMarkers.current = {};
  };

  // ---------- ROUTE MANAGEMENT ----------
  const drawRouteOnMap = (routeGeometry, routeId = 'hospital-route') => {
    if (!map.current || !routeGeometry) return;

    // Limpiar ruta anterior
    clearRoute();

    try {
      map.current.addSource(routeId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeGeometry
          },
          properties: {}
        }
      });

      // Capa principal de ruta
      map.current.addLayer({
        id: routeId,
        type: 'line',
        source: routeId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#2196F3',
          'line-width': 6,
          'line-opacity': 0.9
        }
      });

      // Efecto glow
      map.current.addLayer({
        id: routeId + '-glow',
        type: 'line',
        source: routeId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#2196F3',
          'line-width': 12,
          'line-opacity': 0.3,
          'line-blur': 1.5
        }
      }, routeId);

      routeLayerIds.current = [routeId, routeId + '-glow'];

      // Ajustar vista para mostrar la ruta completa
      const bounds = new mapboxgl.LngLatBounds();
      routeGeometry.forEach(coord => {
        bounds.extend([coord[0], coord[1]]);
      });
      if (hospitalInfo) {
        bounds.extend([hospitalInfo.lng, hospitalInfo.lat]);
      }

      map.current.fitBounds(bounds, {
        padding: 80,
        duration: 1500,
        pitch: 45
      });

    } catch (error) {
      console.error('❌ Error dibujando ruta:', error);
    }
  };

  const clearRoute = () => {
    if (!map.current) return;

    routeLayerIds.current.forEach(layerId => {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(layerId)) {
        map.current.removeSource(layerId);
      }
    });
    routeLayerIds.current = [];
    setActiveRoute(null);
  };

  const calculateRouteToAmbulance = async (ambulance) => {
    if (!ambulance || !ambulance.location || !hospitalInfo) {
      showToast('warning', 'Datos Incompletos', 'No se puede calcular la ruta');
      return;
    }

    try {
      const response = await fetch('http://localhost:3002/directions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startLng: ambulance.location.lng,
          startLat: ambulance.location.lat,
          endLng: hospitalInfo.lng,
          endLat: hospitalInfo.lat
        })
      });

      if (!response.ok) {
        throw new Error('Error calculando ruta');
      }

      const routeData = await response.json();
      
      drawRouteOnMap(routeData.geometry);
      setActiveRoute({
        ambulanceId: ambulance.id,
        geometry: routeData.geometry,
        distance: routeData.distance,
        duration: routeData.duration
      });

      showToast('success', 'Ruta Calculada', 
        `${(routeData.distance / 1000).toFixed(1)} km, ${Math.round(routeData.duration / 60)} min`);

    } catch (error) {
      console.error('❌ Error calculando ruta:', error);
      showToast('error', 'Error de Ruta', 'No se pudo calcular la ruta');
    }
  };

  // ---------- NOTIFICATION HANDLING MEJORADO ----------
  const handlePatientTransferNotification = (data) => {
    console.log('🚨 Notificación de traslado recibida:', data);
    
    const notification = {
      ...data,
      id: data.notificationId || `notif_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      status: 'pending'
    };

    setPatientNotifications(prev => [...prev, notification]);
    setSelectedNotification(notification);

    // Mostrar ruta si está disponible
    if (data.routeGeometry) {
      drawRouteOnMap(data.routeGeometry);
      setActiveRoute({
        ambulanceId: data.ambulanceId,
        geometry: data.routeGeometry,
        distance: data.distance,
        duration: data.duration
      });
    }

    showToast('info', 'Nuevo Paciente en Camino', 
      `Ambulancia ${data.ambulanceId} - ETA: ${data.eta || '?'} min`);
    
    onNotificationOpen();
  };

  const handleNavigationCancelled = (data) => {
    clearRoute();
    setPatientNotifications(prev => 
      prev.filter(n => n.ambulanceId !== data.ambulanceId)
    );
    showToast('info', 'Navegación Cancelada', 'Ambulancia canceló el traslado');
  };

  const acceptPatient = (notification) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      showToast('error', 'Error de Conexión', 'No hay conexión con el servidor');
      return;
    }

    // Enviar aceptación
    ws.current.send(JSON.stringify({
      type: 'hospital_accept_patient',
      notificationId: notification.notificationId,
      hospitalId: hospitalInfo.id,
      hospitalInfo: hospitalInfo
    }));

    setPatientNotifications(prev => 
      prev.filter(n => n.notificationId !== notification.notificationId)
    );
    
    showToast('success', 'Paciente Aceptado', 'Preparar área de recepción');
    onNotificationClose();
  };

  const rejectPatient = (notification) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      showToast('error', 'Error de Conexión', 'No hay conexión con el servidor');
      return;
    }

    // Enviar rechazo
    ws.current.send(JSON.stringify({
      type: 'hospital_reject_patient',
      notificationId: notification.notificationId,
      hospitalId: hospitalInfo.id,
      reason: 'Capacidad limitada - No hay camas disponibles'
    }));

    setPatientNotifications(prev => 
      prev.filter(n => n.notificationId !== notification.notificationId)
    );
    
    clearRoute();
    showToast('warning', 'Paciente Rechazado', 'Se ha notificado a la ambulancia');
    onNotificationClose();
  };

  const sendNoteToAmbulance = () => {
    if (!selectedAmbulance || !noteMessage.trim()) {
      showToast('warning', 'Mensaje Vacío', 'Escribe un mensaje para el conductor');
      return;
    }

    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      showToast('error', 'Error de Conexión', 'No hay conexión con el servidor');
      return;
    }

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

    showToast('success', 'Mensaje Enviado', 'Comunicación enviada al conductor');
    setNoteMessage('');
    setPatientInfo('');
    onNoteClose();
  };

  const requestRouteUpdate = (ambulanceId) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      showToast('error', 'Error de Conexión', 'No hay conexión con el servidor');
      return;
    }

    ws.current.send(JSON.stringify({
      type: 'request_route_update',
      ambulanceId: ambulanceId
    }));

    showToast('info', 'Solicitando Actualización', 'Actualizando información de ruta...');
  };

  // ---------- UTILITY FUNCTIONS ----------
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

  const centerOnHospital = () => {
    if (!map.current || !hospitalInfo) return;
    
    map.current.flyTo({
      center: [hospitalInfo.lng, hospitalInfo.lat],
      zoom: 16,
      pitch: 45,
      duration: 1000
    });
  };

  const reconnect = () => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    connectionAttempts.current = 0;
    connectWebSocket();
  };

  // ---------- RENDER ----------
  if (!hospitalInfo) {
    return (
      <ChakraProvider>
        <Box height="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
          <VStack spacing={4}>
            <Text fontSize="2xl" fontWeight="bold" color="gray.800">
              Configurando Sistema Hospitalario...
            </Text>
            <Progress size="lg" width="300px" isIndeterminate colorScheme="blue" />
            <Text color="gray.600" textAlign="center">
              Verificando ubicación y conectando servicios
            </Text>
          </VStack>
        </Box>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider>
      <Box height="100vh" display="flex" flexDirection="column" bg="gray.50">
        {/* Header */}
        <Box bg="white" p={4} boxShadow="sm" borderBottom="1px" borderColor="gray.200">
          <HStack justifyContent="space-between">
            <VStack align="start" spacing={0}>
              <Text fontSize="xl" fontWeight="bold" color="gray.800">
                🏥 {hospitalInfo.nombre}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Centro de Control Hospitalario - Monitoreo de Emergencias
                <Badge ml={2} colorScheme={wsConnected ? "green" : isConnecting ? "yellow" : "red"} fontSize="xs">
                  {wsConnected ? "SISTEMA CONECTADO" : isConnecting ? "CONECTANDO..." : "SIN CONEXIÓN"}
                </Badge>
              </Text>
            </VStack>

            <HStack spacing={4}>
              <Badge colorScheme="blue" fontSize="md" p={2} borderRadius="md">
                {ambulances.length} AMBULANCIAS
              </Badge>

              {patientNotifications.length > 0 && (
                <Badge colorScheme="red" fontSize="md" p={2} borderRadius="md" cursor="pointer" onClick={onNotificationOpen}>
                  {patientNotifications.length} NOTIFICACIONES
                </Badge>
              )}

              {activeRoute && (
                <Badge colorScheme="purple" fontSize="md" p={2} borderRadius="md">
                  🕐 {Math.round(activeRoute.duration / 60)} min • 📏 {(activeRoute.distance / 1000).toFixed(1)} km
                </Badge>
              )}

              <Button size="sm" colorScheme={wsConnected ? "green" : isConnecting ? "yellow" : "orange"} onClick={reconnect} isDisabled={isConnecting}>
                {isConnecting ? <Spinner size="sm" /> : wsConnected ? "✅ CONECTADO" : "🔌 RECONECTAR"}
              </Button>
            </HStack>
          </HStack>
        </Box>

        {/* Main Content */}
        <Box flex={1} display="flex">
          {/* Side Panel */}
          <Box width="480px" bg="white" p={4} overflowY="auto" boxShadow="md" borderRight="1px" borderColor="gray.200">
            <VStack spacing={6} align="stretch">
              {/* Hospital Info */}
              <Card bg="blue.50" border="1px" borderColor="blue.200">
                <CardBody>
                  <Text fontWeight="bold" mb={3} color="blue.800">🏥 Información del Hospital</Text>
                  <VStack align="start" spacing={2}>
                    <Text fontSize="sm"><strong>Dirección:</strong> {hospitalInfo.direccion}</Text>
                    <Text fontSize="sm"><strong>Teléfono:</strong> {hospitalInfo.telefono || 'No disponible'}</Text>
                    <Text fontSize="sm"><strong>Camas disponibles:</strong> {hospitalInfo.camasDisponibles}</Text>
                    <Text fontSize="sm"><strong>Especialidades:</strong> {hospitalInfo.especialidades.join(', ')}</Text>
                  </VStack>
                </CardBody>
              </Card>

              {/* Ambulances List */}
              <Box>
                <HStack justify="space-between" mb={3}>
                  <Text fontWeight="bold" color="gray.800">🚑 Ambulancias en Servicio</Text>
                  <Text fontSize="sm" color="gray.600">
                    {ambulances.length} conectadas
                  </Text>
                </HStack>

                {ambulances.length === 0 ? (
                  <Text color="gray.500" textAlign="center" py={4} fontSize="sm">
                    No hay ambulancias activas en el sistema
                  </Text>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {ambulances.map(ambulance => (
                      <Card 
                        key={ambulance.id}
                        bg={selectedAmbulance?.id === ambulance.id ? "blue.50" : "white"}
                        border="1px"
                        borderColor={selectedAmbulance?.id === ambulance.id ? "blue.200" : "gray.200"}
                        cursor="pointer"
                        onClick={() => setSelectedAmbulance(ambulance)}
                        _hover={{ borderColor: "blue.300", transform: 'translateY(-1px)' }}
                        transition="all 0.2s"
                      >
                        <CardBody p={3}>
                          <HStack justify="space-between" mb={2}>
                            <Text fontWeight="bold" color="red.600" fontSize="sm">{ambulance.id}</Text>
                            <Badge colorScheme={ambulance.status === 'en_ruta' ? "green" : "orange"} fontSize="2xs">
                              {ambulance.status === 'en_ruta' ? 'EN RUTA' : 'DISPONIBLE'}
                            </Badge>
                          </HStack>
                          
                          <VStack align="start" spacing={1}>
                            <Text fontSize="sm">📋 {ambulance.placa || 'N/A'}</Text>
                            <Text fontSize="sm">🔧 {ambulance.tipo || 'N/A'}</Text>
                            {ambulance.location && (
                              <Text fontSize="sm">💨 {ambulance.speed || 0} km/h</Text>
                            )}
                          </VStack>

                          {activeRoute && activeRoute.ambulanceId === ambulance.id && (
                            <Box mt={2} p={2} bg="blue.100" borderRadius="md">
                              <Text fontSize="sm" fontWeight="bold" color="blue.800">📊 Ruta Activa</Text>
                              <Text fontSize="xs" color="blue.700">
                                🕐 {Math.round(activeRoute.duration / 60)} min • 📏 {(activeRoute.distance / 1000).toFixed(1)} km
                              </Text>
                            </Box>
                          )}

                          <HStack mt={3} spacing={2}>
                            <Button 
                              size="xs" 
                              colorScheme="blue"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (ambulance.location) {
                                  map.current.flyTo({
                                    center: [ambulance.location.lng, ambulance.location.lat],
                                    zoom: 15,
                                    duration: 1000
                                  });
                                }
                              }}
                            >
                              👁️ Seguir
                            </Button>
                            <Button 
                              size="xs" 
                              colorScheme="teal"
                              onClick={(e) => {
                                e.stopPropagation();
                                calculateRouteToAmbulance(ambulance);
                              }}
                            >
                              🛣️ Trazar Ruta
                            </Button>
                            <Button 
                              size="xs" 
                              colorScheme="purple"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNoteOpen();
                              }}
                            >
                              💬 Nota
                            </Button>
                          </HStack>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </Box>

              {/* Active Route Info */}
              {activeRoute && (
                <Card bg="purple.50" border="1px" borderColor="purple.200">
                  <CardBody>
                    <Text fontWeight="bold" mb={2} color="purple.800">📊 Ruta Activa</Text>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm"><strong>Ambulancia:</strong> {activeRoute.ambulanceId}</Text>
                      <Text fontSize="sm"><strong>Distancia:</strong> {(activeRoute.distance / 1000).toFixed(1)} km</Text>
                      <Text fontSize="sm"><strong>Tiempo estimado:</strong> {Math.round(activeRoute.duration / 60)} min</Text>
                    </VStack>
                    <Progress value={70} size="sm" colorScheme="purple" mt={3} borderRadius="full" />
                    <Button 
                      size="sm" 
                      colorScheme="blue" 
                      width="100%" 
                      mt={3}
                      onClick={() => {
                        if (activeRoute.geometry) {
                          const bounds = new mapboxgl.LngLatBounds();
                          activeRoute.geometry.forEach(coord => {
                            bounds.extend([coord[0], coord[1]]);
                          });
                          if (hospitalInfo) {
                            bounds.extend([hospitalInfo.lng, hospitalInfo.lat]);
                          }
                          map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
                        }
                      }}
                    >
                      🗺️ Ajustar Vista
                    </Button>
                  </CardBody>
                </Card>
              )}

              {/* Quick Actions */}
              <VStack spacing={2}>
                <Button 
                  width="100%" 
                  colorScheme="blue" 
                  onClick={centerOnHospital}
                  leftIcon={<Text>🎯</Text>}
                >
                  Centrar en Hospital
                </Button>
                <Button 
                  width="100%" 
                  colorScheme={trafficEnabled ? "orange" : "blue"}
                  onClick={toggleTraffic}
                  leftIcon={<Text>🚦</Text>}
                  variant={trafficEnabled ? "solid" : "outline"}
                >
                  {trafficEnabled ? 'Ocultar Tráfico' : 'Mostrar Tráfico'}
                </Button>
              </VStack>
            </VStack>
          </Box>

          {/* Map */}
          <Box flex={1} position="relative">
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

            {/* Route Info Overlay */}
            {activeRoute && (
              <Box
                position="absolute"
                top="20px"
                left="20px"
                bg="white"
                color="gray.800"
                p={4}
                borderRadius="md"
                boxShadow="xl"
                border="1px"
                borderColor="gray.200"
                zIndex="1000"
                minWidth="320px"
              >
                <Text fontWeight="bold" mb={2} color="blue.600">📊 Ruta Activa - {activeRoute.ambulanceId}</Text>
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm"><strong>🕐 ETA:</strong> {Math.round(activeRoute.duration / 60)} minutos</Text>
                  <Text fontSize="sm"><strong>📏 Distancia:</strong> {(activeRoute.distance / 1000).toFixed(1)} km</Text>
                  <Text fontSize="sm"><strong>🏥 Destino:</strong> {hospitalInfo.nombre}</Text>
                </VStack>
                <Progress value={65} size="sm" colorScheme="blue" mt={2} borderRadius="full" />
                <Button 
                  size="xs" 
                  colorScheme="blue" 
                  mt={2}
                  onClick={() => {
                    if (activeRoute.geometry) {
                      const bounds = new mapboxgl.LngLatBounds();
                      activeRoute.geometry.forEach(coord => {
                        bounds.extend([coord[0], coord[1]]);
                      });
                      if (hospitalInfo) {
                        bounds.extend([hospitalInfo.lng, hospitalInfo.lat]);
                      }
                      map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
                    }
                  }}
                >
                  🗺️ Ajustar Vista
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Note Modal */}
      <Modal isOpen={isNoteOpen} onClose={onNoteClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="blue.600" color="white">
            💬 Enviar Mensaje al Conductor
          </ModalHeader>
          <ModalBody py={4}>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                Para: {selectedAmbulance?.id} - {selectedAmbulance?.placa}
              </Text>

              <Textarea 
                placeholder="Escribe tu mensaje para el conductor de la ambulancia..."
                value={noteMessage}
                onChange={(e) => setNoteMessage(e.target.value)}
                rows={4}
                size="lg"
              />

              <Textarea
                placeholder="Información adicional del paciente (opcional)"
                value={patientInfo}
                onChange={(e) => setPatientInfo(e.target.value)}
                rows={2}
                size="lg"
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onNoteClose}>
              Cancelar
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={sendNoteToAmbulance}
              isDisabled={!noteMessage.trim()}
            >
              📤 Enviar Mensaje
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Notification Modal */}
      <Modal isOpen={isNotificationOpen} onClose={onNotificationClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="blue.600" color="white">
            🚨 Notificación de Traslado de Paciente
          </ModalHeader>
          <ModalBody py={4}>
            {selectedNotification && (
              <VStack spacing={4} align="stretch">
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Ambulancia en Camino!</AlertTitle>
                    <AlertDescription>
                      {selectedNotification.ambulanceId} - {selectedNotification.ambulanceInfo?.placa || 'N/A'}
                    </AlertDescription>
                  </Box>
                </Alert>

                <HStack spacing={4} align="start">
                  <Box flex={1}>
                    <Text fontWeight="bold" mb={2}>Información del Paciente:</Text>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm"><strong>Edad:</strong> {selectedNotification.patientInfo?.age || 'No especificada'}</Text>
                      <Text fontSize="sm"><strong>Sexo:</strong> {selectedNotification.patientInfo?.sex || 'No especificado'}</Text>
                      <Text fontSize="sm"><strong>Emergencia:</strong> {selectedNotification.patientInfo?.type || 'No especificada'}</Text>
                      {selectedNotification.patientInfo?.timestamp && (
                        <Text fontSize="xs" color="gray.600">
                          Reportado: {selectedNotification.patientInfo.timestamp}
                        </Text>
                      )}
                    </VStack>
                  </Box>

                  <Box flex={1}>
                    <Text fontWeight="bold" mb={2}>Información del Traslado:</Text>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm"><strong>ETA:</strong> {selectedNotification.eta || 'Calculando...'}</Text>
                      <Text fontSize="sm"><strong>Distancia:</strong> {selectedNotification.distance || 'Calculando...'}</Text>
                      <Text fontSize="sm"><strong>Ambulancia:</strong> {selectedNotification.ambulanceInfo?.placa || 'N/A'}</Text>
                      <Text fontSize="sm"><strong>Tipo:</strong> {selectedNotification.ambulanceInfo?.tipo || 'N/A'}</Text>
                    </VStack>
                  </Box>
                </HStack>

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
                    onClick={() => {
                      if (selectedNotification.routeGeometry) {
                        const bounds = new mapboxgl.LngLatBounds();
                        selectedNotification.routeGeometry.forEach(coord => {
                          bounds.extend([coord[0], coord[1]]);
                        });
                        if (hospitalInfo) {
                          bounds.extend([hospitalInfo.lng, hospitalInfo.lat]);
                        }
                        map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
                      }
                    }}
                  >
                    🗺️ Ver Ruta en el Mapa
                  </Button>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" variant="outline" mr={3} onClick={() => rejectPatient(selectedNotification)}>
              Rechazar Paciente
            </Button>
            <Button colorScheme="green" onClick={() => acceptPatient(selectedNotification)}>
              ✅ Aceptar Paciente
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ChakraProvider>
  );
}