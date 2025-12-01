// MapaOperadorOptimizado.jsx - VERSIÓN COMPLETA CORREGIDA
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
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
  Input,
  Select,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Card,
  CardBody,
  Progress,
  InputGroup,
  InputRightElement,
  IconButton,
  Spinner,
  useColorMode,
  useColorModeValue,
  extendTheme,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Divider,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb
} from '@chakra-ui/react';

import { 
  SearchIcon, 
  CloseIcon, 
  MoonIcon, 
  SunIcon,
  AddIcon,
  MinusIcon
} from '@chakra-ui/icons';

import { 
  FaCompass,
  FaMapMarkerAlt,
  FaHospital,
  FaRoute,
  FaTachometerAlt,
  FaLocationArrow,
  FaAmbulance,
  FaUserMd,
  FaHeartbeat,
  FaBed,
  FaPhone,
  FaClock,
  FaRoad,
  FaExclamationTriangle,
  FaArrowLeft,
  FaArrowRight,
  FaSync,
  FaTimes,
  FaCheck,
  FaTimesCircle,
  FaHourglassHalf
} from 'react-icons/fa';

// Configuración del tema
const config = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({ config });

mapboxgl.accessToken = 'pk.eyJ1IjoiZWR1YXJkbzI1MGplbW0iLCJhIjoiY2xwYzVvdzc3MDNlYjJoazUzbzZsYjRwNiJ9.KsDXLdjWn2R4fMX-YIIU8g';

function ColorModeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton
      aria-label="Toggle color mode"
      icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
      onClick={toggleColorMode}
      variant="ghost"
      size="sm"
    />
  );
}

export default function MapaOperadorOptimizado() {
  // Refs
  const mapContainer = useRef(null);
  const map = useRef(null);
  const ambulanceMarker = useRef(null);
  const watchId = useRef(null);
  const ws = useRef(null);
  const hospitalMarkers = useRef([]);
  const emergencyMarker = useRef(null);
  const routeLayerIds = useRef([]);
  const reconnectTimeout = useRef(null);
  const connectionAttempts = useRef(0);
  const maxConnectionAttempts = 5;
  const lastPosition = useRef(null);
  const lastUpdateTime = useRef(null);
  const distanceTraveled = useRef(0);
  const speedHistory = useRef([]);
  const isMounted = useRef(true);

  // Estado principal
  const [pos, setPos] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [deviceOrientation, setDeviceOrientation] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [destination, setDestination] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [hospitalNotification, setHospitalNotification] = useState(null);
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [accuracy, setAccuracy] = useState(null);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [tripDistance, setTripDistance] = useState(0);

  // Estado de emergencia
  const { isOpen: isEmergencyDrawerOpen, onOpen: onEmergencyDrawerOpen, onClose: onEmergencyDrawerClose } = useDisclosure();
  const { isOpen: isHospitalDrawerOpen, onOpen: onHospitalDrawerOpen, onClose: onHospitalDrawerClose } = useDisclosure();
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [emergencyType, setEmergencyType] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [emergencyStep, setEmergencyStep] = useState('mode');
  const [emergencyMode, setEmergencyMode] = useState('');
  const [includePatientInfo, setIncludePatientInfo] = useState(false);
  const [patientCondition, setPatientCondition] = useState('');
  const [vitalSigns, setVitalSigns] = useState({
    heartRate: '',
    bloodPressure: '',
    oxygenSaturation: '',
    respiratoryRate: ''
  });
  const [ambulanceStatus, setAmbulanceStatus] = useState('disponible');

  const toast = useToast();
  const { colorMode } = useColorMode();

  // Colores dinámicos
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const headerBg = useColorModeValue('white', 'gray.800');

  // ---------- FUNCIONES DE NAVEGACIÓN ----------
  const nextStep = () => {
    if (emergencyStep === 'mode' && emergencyMode) {
      if (emergencyMode === 'atender_emergencia') {
        setEmergencyStep('location');
      } else if (emergencyMode === 'trasladar_paciente') {
        setEmergencyStep('patient');
      }
    } else if (emergencyStep === 'patient') {
      setEmergencyStep('hospital');
    } else if (emergencyStep === 'location') {
      setEmergencyStep('hospital');
    }
  };

  const prevStep = () => {
    if (emergencyStep === 'patient' || emergencyStep === 'location') {
      setEmergencyStep('mode');
    } else if (emergencyStep === 'hospital') {
      if (emergencyMode === 'atender_emergencia') {
        setEmergencyStep('location');
      } else {
        setEmergencyStep('patient');
      }
    }
  };

  // ---------- CÁLCULO DE DISTANCIA ----------
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateDistanceBetweenPoints = (point1, point2) => {
    if (!point1 || !point2) return 0;
    return calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);
  };

  // ---------- GEOLOCALIZACIÓN ----------
  const startPreciseLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('error', 'GPS No Disponible', 'Su dispositivo no soporta geolocalización');
      return;
    }

    const geoOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    };

    const handlePositionSuccess = (position) => {
      if (!isMounted.current) return;

      const { 
        latitude, 
        longitude, 
        speed: spd, 
        heading: hdg,
        accuracy: acc 
      } = position.coords;

      const currentTime = Date.now();
      const currentSpeed = spd ? Math.max(0, Math.round(spd * 3.6)) : 0;
      const currentHeading = hdg || 0;
      const currentAccuracy = acc || null;

      // Calcular distancia recorrida
      if (lastPosition.current && lastUpdateTime.current) {
        const distance = calculateDistanceBetweenPoints(
          lastPosition.current,
          { lat: latitude, lng: longitude }
        );
        
        distanceTraveled.current += distance;
        setTripDistance(prev => prev + distance);
        
        // Calcular velocidad promedio
        const timeDiff = (currentTime - lastUpdateTime.current) / 1000;
        if (timeDiff > 0) {
          const instantSpeed = (distance / timeDiff) * 3600;
          speedHistory.current.push(instantSpeed);
          
          if (speedHistory.current.length > 10) {
            speedHistory.current.shift();
          }
          
          const avg = speedHistory.current.reduce((a, b) => a + b, 0) / speedHistory.current.length;
          setAvgSpeed(Math.round(avg));
          
          if (instantSpeed > maxSpeed) {
            setMaxSpeed(Math.round(instantSpeed));
          }
        }
      }

      lastPosition.current = { lat: latitude, lng: longitude };
      lastUpdateTime.current = currentTime;

      setPos({ lat: latitude, lng: longitude });
      setSpeed(currentSpeed);
      setHeading(currentHeading);
      setAccuracy(currentAccuracy);

      updateAmbulanceMarker({ lat: latitude, lng: longitude }, currentHeading);
      sendLocationUpdate({ lat: latitude, lng: longitude }, currentSpeed, currentHeading);
    };

    const handlePositionError = (error) => {
      if (!isMounted.current) return;
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          showToast('error', 'Permiso Denegado', 'Se necesita permiso para acceder a la ubicación');
          break;
        default:
          console.error('Error de geolocalización:', error);
      }
    };

    navigator.permissions?.query({ name: 'geolocation' })
      .then(permissionStatus => {
        if (permissionStatus.state === 'granted') {
          watchId.current = navigator.geolocation.watchPosition(
            handlePositionSuccess,
            handlePositionError,
            geoOptions
          );

          navigator.geolocation.getCurrentPosition(
            handlePositionSuccess,
            handlePositionError,
            geoOptions
          );
        } else {
          navigator.geolocation.getCurrentPosition(
            () => {
              startPreciseLocationTracking();
            },
            handlePositionError,
            geoOptions
          );
        }
      })
      .catch(() => {
        watchId.current = navigator.geolocation.watchPosition(
          handlePositionSuccess,
          handlePositionError,
          geoOptions
        );
      });
  }, []);

  // ---------- MARCADOR DE AMBULANCIA 3D ----------
  const updateAmbulanceMarker = useCallback((position, headingAngle) => {
    if (!map.current || !position) return;

    const rotationAngle = headingAngle || 0;
    
    if (!ambulanceMarker.current) {
      const el = document.createElement('div');
      el.className = 'ambulance-marker-3d';
      el.innerHTML = `
        <div style="
          position: relative;
          width: 80px;
          height: 80px;
          transform: rotate(${rotationAngle}deg);
          transition: transform 0.5s ease;
        ">
          <div style="
            position: absolute;
            top: 10px;
            left: 10px;
            width: 40px;
            height: 25px;
            background: linear-gradient(135deg, #FF4444, #CC0000);
            border-radius: 8px 8px 4px 4px;
            box-shadow: 
              0 4px 8px rgba(0,0,0,0.3),
              inset 0 2px 4px rgba(255,255,255,0.2),
              2px 2px 4px rgba(0,0,0,0.4);
            transform: perspective(100px) rotateX(10deg);
          ">
            <div style="
              position: absolute;
              top: -8px;
              left: 15px;
              width: 10px;
              height: 8px;
              background: #FFD700;
              border-radius: 4px 4px 0 0;
              box-shadow: 0 0 10px #FFD700;
            "></div>
            <div style="
              position: absolute;
              top: -8px;
              right: 15px;
              width: 10px;
              height: 8px;
              background: #FFD700;
              border-radius: 4px 4px 0 0;
              box-shadow: 0 0 10px #FFD700;
            "></div>
          </div>
          
          <div style="
            position: absolute;
            top: 0;
            left: 25px;
            width: 20px;
            height: 15px;
            background: linear-gradient(135deg, #FFFFFF, #CCCCCC);
            border-radius: 5px 5px 2px 2px;
            box-shadow: 
              0 2px 4px rgba(0,0,0,0.3),
              inset 0 1px 2px rgba(255,255,255,0.4);
          "></div>
          
          <div style="
            position: absolute;
            top: -5px;
            left: 35px;
            width: 10px;
            height: 10px;
            background: linear-gradient(45deg, #FF0000, #0000FF);
            border-radius: 50%;
            animation: spinSiren 1s linear infinite;
            box-shadow: 0 0 15px rgba(255,0,0,0.7);
          "></div>
          
          <div style="
            position: absolute;
            bottom: 0;
            left: 10px;
            width: 8px;
            height: 8px;
            background: #222;
            border-radius: 50%;
            border: 2px solid #444;
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
          "></div>
          <div style="
            position: absolute;
            bottom: 0;
            right: 10px;
            width: 8px;
            height: 8px;
            background: #222;
            border-radius: 50%;
            border: 2px solid #444;
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
          "></div>
        </div>
        
        <style>
          @keyframes spinSiren {
            0% { transform: rotate(0deg); background: linear-gradient(45deg, #FF0000, #0000FF); }
            25% { background: linear-gradient(45deg, #0000FF, #FF0000); }
            50% { background: linear-gradient(45deg, #FF0000, #0000FF); }
            75% { background: linear-gradient(45deg, #0000FF, #FF0000); }
            100% { transform: rotate(360deg); background: linear-gradient(45deg, #FF0000, #0000FF); }
          }
        </style>
      `;
      
      ambulanceMarker.current = new mapboxgl.Marker({ 
        element: el,
        anchor: 'center',
        rotationAlignment: 'map',
        pitchAlignment: 'map'
      })
        .setLngLat([position.lng, position.lat])
        .addTo(map.current);

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 12px; min-width: 200px;">
            <strong style="color: #FF4444; font-size: 14px;">🚑 Ambulancia UVI-01</strong>
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
              <div><strong>Velocidad:</strong> ${speed} km/h</div>
              <div><strong>Dirección:</strong> ${Math.round(rotationAngle)}°</div>
              <div><strong>Estado:</strong> ${ambulanceStatus}</div>
              ${accuracy ? `<div><strong>Precisión:</strong> ±${Math.round(accuracy)}m</div>` : ''}
            </div>
          </div>
        `);

      ambulanceMarker.current.setPopup(popup);
    } else {
      ambulanceMarker.current.setLngLat([position.lng, position.lat]);
      
      const markerElement = ambulanceMarker.current.getElement();
      if (markerElement) {
        const containerDiv = markerElement.querySelector('div');
        if (containerDiv) {
          containerDiv.style.transform = `rotate(${rotationAngle}deg)`;
        }
      }

      if (ambulanceMarker.current.getPopup()) {
        ambulanceMarker.current.getPopup().setHTML(`
          <div style="padding: 12px; min-width: 200px;">
            <strong style="color: #FF4444; font-size: 14px;">🚑 Ambulancia UVI-01</strong>
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
              <div><strong>Velocidad:</strong> ${speed} km/h</div>
              <div><strong>Dirección:</strong> ${Math.round(rotationAngle)}°</div>
              <div><strong>Estado:</strong> ${ambulanceStatus}</div>
              ${accuracy ? `<div><strong>Precisión:</strong> ±${Math.round(accuracy)}m</div>` : ''}
            </div>
          </div>
        `);
      }
    }

    if (!isNavigating && pos) {
      map.current.easeTo({
        center: [position.lng, position.lat],
        bearing: rotationAngle,
        pitch: speed > 40 ? 60 : 70,
        zoom: speed > 60 ? 15 : 16,
        duration: 1000
      });
    }
  }, [speed, ambulanceStatus, accuracy, isNavigating, pos]);

  // ---------- WEBSOCKET CONNECTION MEJORADA ----------
  const connectWebSocket = useCallback(() => {
    if (!isMounted.current || isConnecting || connectionAttempts.current >= maxConnectionAttempts) {
      return;
    }

    try {
      if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      console.log('🔗 Conectando operador al WebSocket...');
      setIsConnecting(true);
      connectionAttempts.current += 1;

      ws.current = new WebSocket('ws://localhost:3002/ws');

      ws.current.onopen = () => {
        if (!isMounted.current) return;
        
        console.log('✅ Operador conectado al servidor WebSocket');
        setWsConnected(true);
        setIsConnecting(false);
        connectionAttempts.current = 0;
        
        // Registrar ambulancia
        safeSend({
          type: 'register_ambulance',
          ambulance: {
            id: 'UVI-01',
            placa: 'ABC123',
            tipo: 'UVI Móvil',
            status: ambulanceStatus,
            location: pos
          }
        });

        // Cargar TODOS los hospitales desde API HTTP
        loadAllHospitalsFromAPI();

        // Solicitar hospitales activos vía WebSocket
        safeSend({
          type: 'request_hospitals_list'
        });

        showToast('success', 'Sistema Conectado', 'Conectado al servidor WebSocket');
      };

      ws.current.onmessage = (event) => {
        if (!isMounted.current) return;
        
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Mensaje recibido:', data.type);

          switch (data.type) {
            case 'connection_established':
              console.log('✅ Conexión WebSocket confirmada');
              break;

            case 'active_hospitals_update':
              console.log('🏥 Hospitales activos actualizados:', data.hospitals.length);
              // Actualizar estado de conexión de hospitales
              updateHospitalConnectionStatus(data.hospitals);
              break;

            case 'all_hospitals_list':
              console.log('🏥 Todos los hospitales cargados vía WS:', data.hospitals.length);
              // Procesar lista de hospitales del WebSocket
              processHospitalsList(data.hospitals);
              break;

            case 'hospital_note':
              showToast('info', 'Mensaje del Hospital', data.note?.message || 'Nueva comunicación');
              break;

            case 'patient_accepted':
              handlePatientAccepted(data);
              break;

            case 'patient_rejected':
              handlePatientRejected(data);
              break;

            case 'navigation_cancelled':
              handleNavigationCancelled(data);
              break;

            case 'notification_sent':
              showToast('success', 'Notificación Enviada', 'Hospital notificado correctamente');
              break;

            case 'automatic_redirect':
              handleAutomaticRedirect(data);
              break;

            case 'error':
              showToast('error', 'Error del Sistema', data.message);
              break;

            default:
              console.log('📨 Mensaje no procesado:', data.type);
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
          }, 5000);
        } else if (connectionAttempts.current >= maxConnectionAttempts) {
          showToast('error', 'Error de Conexión', 'No se pudo conectar después de varios intentos');
        }
      };

      ws.current.onerror = (error) => {
        if (!isMounted.current) return;
        
        console.error('❌ Error WebSocket:', error);
        setWsConnected(false);
        setIsConnecting(false);
        showToast('error', 'Error de Conexión', 'Verifique su conexión a internet');
      };

    } catch (error) {
      console.error('❌ Error al conectar WebSocket:', error);
      setIsConnecting(false);
    }
  }, [isConnecting, pos, ambulanceStatus]);

  // ---------- CARGA DE TODOS LOS HOSPITALES DESDE API ----------
  const loadAllHospitalsFromAPI = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/all-hospitals');
      const data = await response.json();
      
      if (data.hospitals) {
        console.log(`🏥 ${data.hospitals.length} hospitales cargados desde API`);
        processHospitalsList(data.hospitals);
      }
    } catch (error) {
      console.error('❌ Error cargando hospitales desde API:', error);
      showToast('error', 'Error de Carga', 'No se pudieron cargar los hospitales del sistema');
    }
  };

  // ---------- PROCESAR LISTA DE HOSPITALES ----------
  const processHospitalsList = (hospitalsData) => {
    if (!hospitalsData || hospitalsData.length === 0) {
      console.log('❌ No hay hospitales para cargar');
      return;
    }

    // Calcular distancia para cada hospital si tenemos posición
    const hospitalsWithDistance = hospitalsData.map(hospital => {
      let distance = null;
      if (pos && hospital.lat && hospital.lng) {
        distance = calculateDistance(
          pos.lat, pos.lng,
          hospital.lat, hospital.lng
        );
      }
      return {
        ...hospital,
        distance,
        // hospital.connected viene del WebSocket
        // hospital.activo viene de la base de datos
      };
    });

    // Ordenar por distancia si tenemos posición, sino por nombre
    const sortedHospitals = pos 
      ? hospitalsWithDistance.sort((a, b) => {
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        })
      : hospitalsWithDistance.sort((a, b) => a.nombre.localeCompare(b.nombre));

    setHospitals(sortedHospitals);
    updateHospitalMarkers(sortedHospitals);

    console.log(`✅ ${sortedHospitals.length} hospitales procesados (${sortedHospitals.filter(h => h.connected).length} conectados)`);
    showToast('success', 'Hospitales Cargados', `${sortedHospitals.length} hospitales en sistema`);
  };

  // ---------- ACTUALIZAR ESTADO DE CONEXIÓN DE HOSPITALES ----------
  const updateHospitalConnectionStatus = (activeHospitals) => {
    // Actualizar estado de conexión basado en hospitales activos del WebSocket
    const updatedHospitals = hospitals.map(hospital => {
      const isActive = activeHospitals.some(active => active.id === hospital.id);
      return { ...hospital, connected: isActive };
    });
    
    setHospitals(updatedHospitals);
    updateHospitalMarkers(updatedHospitals);
  };

  // ---------- ACTUALIZAR MARCADORES DE HOSPITAL ----------
  const updateHospitalMarkers = (hospitalsList) => {
    if (!map.current) return;

    // Limpiar marcadores anteriores
    hospitalMarkers.current.forEach(marker => marker.remove());
    hospitalMarkers.current = [];

    hospitalsList.forEach((hospital, index) => {
      if (!hospital.lat || !hospital.lng) return;

      const isConnected = hospital.connected;
      const isActiveInDB = hospital.activo; // Estado en base de datos
      const isClosest = index === 0 && hospital.distance !== null;
      
      // Solo mostrar hospitales ACTIVOS en BD
      if (!isActiveInDB) return;

      // Determinar color basado en estado
      let backgroundColor = 'linear-gradient(135deg, #FF9800, #F57C00)'; // Naranja: activo pero no conectado
      let borderColor = '#FF9800';
      let opacity = 0.8;
      let icon = '🏢';
      
      if (isConnected) {
        backgroundColor = 'linear-gradient(135deg, #4CAF50, #2E7D32)'; // Verde: conectado
        borderColor = '#4CAF50';
        opacity = 1;
        icon = '🏥';
      }

      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          width: ${isClosest ? '70px' : '60px'};
          height: ${isClosest ? '70px' : '60px'};
          background: ${backgroundColor};
          border: ${isClosest ? '4px' : '3px'} solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${isClosest ? '26px' : '22px'};
          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
          cursor: ${isConnected ? 'pointer' : 'default'};
          opacity: ${opacity};
          position: relative;
          transition: all 0.3s ease;
          ${isClosest && isConnected ? 'animation: pulse 2s infinite;' : ''}
        ">
          ${icon}
          ${isClosest ? `
            <div style="
              position: absolute;
              top: -8px;
              right: -8px;
              background: #FF9800;
              color: white;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              font-size: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              box-shadow: 0 2px 8px rgba(255,152,0,0.5);
            ">${index + 1}</div>
          ` : ''}
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 6px 20px rgba(76,175,80,0.3); }
            50% { transform: scale(1.05); box-shadow: 0 8px 25px rgba(76,175,80,0.5); }
            100% { transform: scale(1); box-shadow: 0 6px 20px rgba(76,175,80,0.3); }
          }
        </style>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 12px; max-width: 280px; font-family: Arial, sans-serif;">
            <strong style="font-size: 16px; color: #333;">${hospital.nombre}</strong>
            <div style="margin: 8px 0; font-size: 14px; color: #666;">
              <div>📍 ${hospital.direccion || 'Dirección no disponible'}</div>
              ${hospital.distance ? `<div style="margin-top: 4px;">📏 ${hospital.distance.toFixed(1)} km de distancia</div>` : ''}
              ${hospital.especialidades?.length > 0 ? 
                `<div style="margin-top: 4px;">🏥 ${hospital.especialidades.join(', ')}</div>` : ''}
              ${hospital.camasDisponibles ? 
                `<div style="margin-top: 4px;">🛏️ ${hospital.camasDisponibles} camas disponibles</div>` : ''}
              ${hospital.telefono ? 
                `<div style="margin-top: 4px;">📞 ${hospital.telefono}</div>` : ''}
              <div style="margin-top: 4px;">
                <span style="color: ${isConnected ? '#4CAF50' : '#FF9800'}; font-weight: bold;">
                  ${isConnected ? '✅ CONECTADO' : '🟡 ACTIVO (SIN CONEXIÓN)'}
                </span>
              </div>
            </div>
            ${isConnected ? `
              <button onclick="window.selectHospitalFromMap('${hospital.id}')" 
                style="width: 100%; padding: 10px 16px; background: #2196F3; color: white; 
                border: none; border-radius: 8px; cursor: pointer; margin-top: 8px; font-weight: bold;
                box-shadow: 0 2px 8px rgba(33,150,243,0.3); transition: all 0.2s;"
                onmouseover="this.style.background='#1976D2'" 
                onmouseout="this.style.background='#2196F3'">
                🚑 Seleccionar Destino
              </button>
            ` : 
            '<div style="padding: 10px; background: #FF9800; color: white; text-align: center; border-radius: 8px; margin-top: 8px; font-size: 14px;">Hospital no disponible para selección</div>'}
          </div>
        `);

      const hospitalMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([hospital.lng, hospital.lat])
        .setPopup(popup)
        .addTo(map.current);

      hospitalMarkers.current.push(hospitalMarker);

      if (isConnected) {
        el.addEventListener('click', () => {
          setSelectedHospital(hospital.id);
          showToast('info', 'Destino Seleccionado', hospital.nombre);
        });
      }
    });

    // Función global para selección desde popup
    window.selectHospitalFromMap = (hospitalId) => {
      const hospital = hospitalsList.find(h => h.id === hospitalId);
      if (hospital) {
        setSelectedHospital(hospitalId);
        showToast('info', 'Destino Seleccionado', hospital.nombre);
        
        map.current.flyTo({
          center: [hospital.lng, hospital.lat],
          zoom: 16,
          duration: 1000
        });
      }
    };
  };

  // ---------- CAPA DE TRÁFICO MEJORADA ----------
  const addTrafficLayer = () => {
    if (!map.current) return;

    try {
      if (!map.current.getSource('mapbox-traffic')) {
        map.current.addSource('mapbox-traffic', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1'
        });
      }

      if (map.current.getLayer('traffic-layer')) {
        map.current.removeLayer('traffic-layer');
      }

      map.current.addLayer({
        id: 'traffic-layer',
        type: 'line',
        source: 'mapbox-traffic',
        'source-layer': 'traffic',
        paint: {
          'line-color': [
            'match',
            ['get', 'congestion'],
            'low', '#00E676',
            'moderate', '#FF9100',
            'heavy', '#FF3D00',
            'severe', '#D50000',
            '#00E676'
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 2,
            14, 4,
            18, 8
          ],
          'line-opacity': 0.9,
          'line-blur': 0.5
        },
        'layout': {
          'line-cap': 'round',
          'line-join': 'round',
          'visibility': trafficEnabled ? 'visible' : 'none'
        }
      }, 'road-label');

      map.current.addLayer({
        id: 'traffic-layer-glow',
        type: 'line',
        source: 'mapbox-traffic',
        'source-layer': 'traffic',
        paint: {
          'line-color': [
            'match',
            ['get', 'congestion'],
            'low', 'rgba(0, 230, 118, 0.3)',
            'moderate', 'rgba(255, 145, 0, 0.3)',
            'heavy', 'rgba(255, 61, 0, 0.3)',
            'severe', 'rgba(213, 0, 0, 0.3)',
            'rgba(0, 230, 118, 0.3)'
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 4,
            14, 8,
            18, 16
          ],
          'line-opacity': 0.5,
          'line-blur': 2
        },
        'layout': {
          'line-cap': 'round',
          'line-join': 'round',
          'visibility': trafficEnabled ? 'visible' : 'none'
        }
      }, 'traffic-layer');

      setTrafficEnabled(true);
      showToast('info', 'Tráfico', 'Capa de tráfico activada');

    } catch (error) {
      console.warn('No se pudo agregar capa de tráfico:', error);
    }
  };

  const toggleTraffic = () => {
    if (!map.current) return;

    if (trafficEnabled) {
      if (map.current.getLayer('traffic-layer')) {
        map.current.setLayoutProperty('traffic-layer', 'visibility', 'none');
        map.current.setLayoutProperty('traffic-layer-glow', 'visibility', 'none');
      }
      setTrafficEnabled(false);
      showToast('info', 'Tráfico', 'Capa de tráfico desactivada');
    } else {
      addTrafficLayer();
    }
  };

  // ---------- MANEJO DE RESPUESTAS DE HOSPITAL ----------
  const handlePatientAccepted = (data) => {
    setHospitalNotification({
      type: 'accepted',
      message: `✅ ${data.hospitalInfo?.nombre || 'Hospital'} ha aceptado al paciente - Proceda al traslado`,
      hospitalInfo: data.hospitalInfo
    });
    
    setIsNavigating(true);
    setAmbulanceStatus('en_ruta');
    
    const updatedHospitals = hospitals.map(h => 
      h.id === data.hospitalId ? { ...h, camasDisponibles: (h.camasDisponibles || 1) - 1 } : h
    );
    setHospitals(updatedHospitals);
    
    setTimeout(() => setHospitalNotification(null), 6000);
  };

  const handlePatientRejected = (data) => {
    setHospitalNotification({
      type: 'rejected', 
      message: `❌ ${data.hospitalInfo?.nombre || 'Hospital'} no puede aceptar al paciente. Razón: ${data.reason}`,
      hospitalInfo: data.hospitalInfo
    });
    
    setIsNavigating(false);
    clearRoute();
    setAmbulanceStatus('disponible');
    
    const currentHospitalIndex = hospitals.findIndex(h => h.id === data.hospitalId);
    if (currentHospitalIndex !== -1) {
      const nextHospital = hospitals
        .slice(currentHospitalIndex + 1)
        .find(h => h.connected && h.activo);
      
      if (nextHospital) {
        setTimeout(() => {
          sendToNextHospital(nextHospital);
          showToast('info', 'Redireccionando', `Solicitud enviada a ${nextHospital.nombre}`);
        }, 2000);
      }
    }
  };

  const handleAutomaticRedirect = (data) => {
    showToast('info', 'Redirección Automática', data.message || 'Solicitud enviada a otro hospital');
    setSelectedHospital(data.newHospitalId);
  };

  const handleNavigationCancelled = (data) => {
    setIsNavigating(false);
    clearRoute();
    setAmbulanceStatus('disponible');
    setHospitalNotification(null);
    showToast('info', 'Navegación Cancelada', data.message || 'Ruta eliminada del sistema');
  };

  // ---------- ENVÍO A SIGUIENTE HOSPITAL ----------
  const sendToNextHospital = async (hospital) => {
    if (!pos) {
      showToast('error', 'Ubicación No Disponible', 'Esperando señal GPS...');
      return;
    }

    try {
      const routeData = await calculateRoute(pos, hospital);
      if (!routeData) return;

      drawRoute(routeData.geometry);
      
      setRouteInfo({
        distance: (routeData.distance / 1000).toFixed(1),
        duration: Math.round(routeData.duration / 60),
        hospital: hospital.nombre,
        address: hospital.direccion,
        rawDistance: routeData.distance,
        rawDuration: routeData.duration
      });

      const patientInfo = includePatientInfo ? {
        age: age,
        sex: sex,
        emergencyType: emergencyType,
        condition: patientCondition,
        vitalSigns: vitalSigns,
        timestamp: new Date().toLocaleString(),
        emergencyLocation: selectedLocation ? searchQuery : 'Ubicación actual'
      } : {
        timestamp: new Date().toLocaleString(),
        emergencyLocation: selectedLocation ? searchQuery : 'Ubicación actual',
        infoProvided: false
      };

      safeSend({
        type: 'patient_transfer_notification',
        ambulanceId: 'UVI-01',
        hospitalId: hospital.id,
        patientInfo: patientInfo,
        ambulanceLocation: selectedLocation || pos,
        eta: Math.round(routeData.duration / 60),
        distance: (routeData.distance / 1000).toFixed(1),
        routeGeometry: routeData.geometry,
        rawDistance: routeData.distance,
        rawDuration: routeData.duration,
        emergencyMode: emergencyMode
      });

      setIsNavigating(true);
      setDestination(hospital);
      setAmbulanceStatus('en_ruta');
      
      setHospitalNotification({
        type: 'pending',
        message: `⏳ Enviando solicitud a ${hospital.nombre}...`
      });

      showToast('info', 'Solicitud Enviada', `Hospital ${hospital.nombre} notificado`);

    } catch (error) {
      console.error('❌ Error enviando a siguiente hospital:', error);
      showToast('error', 'Error del Sistema', 'No se pudo enviar la solicitud al siguiente hospital');
    }
  };

  // ---------- CÁLCULO DE RUTA ----------
  const calculateRoute = async (start, end) => {
    if (!start || !end) {
      showToast('error', 'Error de Ruta', 'Ubicaciones no válidas para calcular ruta');
      return null;
    }

    try {
      const response = await fetch('http://localhost:3002/directions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startLng: start.lng,
          startLat: start.lat,
          endLng: end.lng,
          endLat: end.lat
        })
      });

      if (!response.ok) {
        throw new Error('Error calculando ruta');
      }

      const routeData = await response.json();
      return routeData;
    } catch (error) {
      console.error('❌ Error calculando ruta:', error);
      showToast('error', 'Error de Ruta', 'No se pudo calcular la ruta al destino');
      return null;
    }
  };

  // ---------- DIBUJAR RUTA ----------
  const drawRoute = (routeGeometry, routeId = 'active-route') => {
    if (!map.current || !routeGeometry) return;

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
          'line-width': 14,
          'line-opacity': 0.3,
          'line-blur': 2
        }
      }, routeId);

      routeLayerIds.current = [routeId, routeId + '-glow'];

      const bounds = new mapboxgl.LngLatBounds();
      routeGeometry.forEach(coord => {
        bounds.extend([coord[0], coord[1]]);
      });
      if (pos) bounds.extend([pos.lng, pos.lat]);

      map.current.fitBounds(bounds, {
        padding: 120,
        duration: 2000,
        pitch: 55
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
    setRouteInfo(null);
  };

  // ---------- BÚSQUEDA DE DIRECCIONES ----------
  const searchAddresses = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch('http://localhost:3002/search-addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery
        })
      });

      if (!response.ok) {
        throw new Error('Error en búsqueda');
      }

      const results = await response.json();
      
      const filteredResults = results.filter(result => {
        const hasNumber = /\d/.test(result.place_name);
        const isAddress = result.type === 'address';
        const isInMorelia = result.place_name.toLowerCase().includes('morelia') || 
                           result.context?.toLowerCase().includes('morelia');
        
        return (isAddress || hasNumber) && (isInMorelia || result.relevance > 0.4);
      }).sort((a, b) => {
        const aHasNumber = /\d/.test(a.place_name) ? 1 : 0;
        const bHasNumber = /\d/.test(b.place_name) ? 1 : 0;
        return bHasNumber - aHasNumber || b.relevance - a.relevance;
      });
      
      setSearchResults(filteredResults.slice(0, 10));

    } catch (error) {
      console.error('❌ Error buscando direcciones:', error);
      showToast('error', 'Error de Búsqueda', 'No se pudieron cargar los resultados');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    setSearchQuery(result.place_name);
    setSearchResults([]);
    
    placeEmergencyMarker(
      { lat: result.lat, lng: result.lng },
      result.place_name
    );
  };

  // ---------- MARCADOR DE EMERGENCIA ----------
  const placeEmergencyMarker = (location, address = 'Punto de Emergencia') => {
    if (!map.current) return;

    if (emergencyMarker.current) {
      emergencyMarker.current.remove();
    }

    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        position: relative;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #FF9800, #F57C00);
        border: 4px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 26px;
        box-shadow: 0 6px 20px rgba(255,152,0,0.5);
        cursor: pointer;
        animation: pulse 2s infinite;
      ">
        ⚠️
        <div style="
          position: absolute;
          top: -10px;
          right: -10px;
          width: 20px;
          height: 20px;
          background: #FF4444;
          border-radius: 50%;
          border: 2px solid white;
          animation: blink 1s infinite;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>
    `;

    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(`
        <div style="padding: 12px; max-width: 250px;">
          <strong style="font-size: 16px; color: #FF9800;">⚠️ PUNTO DE EMERGENCIA</strong>
          <div style="margin: 8px 0; font-size: 14px; color: #666;">
            ${address}
          </div>
          <button onclick="window.centerOnEmergency()" 
            style="width: 100%; padding: 8px; background: #2196F3; color: white;
            border: none; border-radius: 6px; cursor: pointer; margin-top: 8px;">
            🗺️ Centrar en emergencia
          </button>
        </div>
      `);

    emergencyMarker.current = new mapboxgl.Marker({ element: el })
      .setLngLat([location.lng, location.lat])
      .setPopup(popup)
      .addTo(map.current);

    window.centerOnEmergency = () => {
      map.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 18,
        pitch: 70,
        duration: 1500
      });
    };

    map.current.flyTo({
      center: [location.lng, location.lat],
      zoom: 18,
      pitch: 70,
      duration: 1500
    });

    setSelectedLocation(location);
    showToast('info', 'Ubicación de Emergencia', 'Punto de emergencia marcado en el mapa');
  };

  // ---------- IR AL LUGAR DEL ACCIDENTE ----------
  const goToEmergencyLocation = () => {
    if (!selectedLocation) {
      showToast('warning', 'Ubicación Requerida', 'Primero busque y seleccione una ubicación');
      return;
    }

    map.current.flyTo({
      center: [selectedLocation.lng, selectedLocation.lat],
      zoom: 18,
      duration: 1500,
      pitch: 70
    });

    showToast('info', 'Navegando a Emergencia', 'Ubicación de emergencia centrada en el mapa');
  };

  // ---------- INICIAR EMERGENCIA ----------
  const startEmergency = async () => {
    if (emergencyMode === 'atender_emergencia' && !selectedLocation) {
      showToast('warning', 'Ubicación Requerida', 'Seleccione la ubicación de la emergencia');
      return;
    }

    if (emergencyMode === 'trasladar_paciente' && !selectedHospital) {
      showToast('warning', 'Hospital No Seleccionado', 'Seleccione un hospital destino');
      return;
    }

    const hospital = hospitals.find(h => h.id === selectedHospital && h.connected && h.activo);
    if (emergencyMode === 'trasladar_paciente' && !hospital) {
      showToast('error', 'Hospital No Disponible', 'El hospital seleccionado no está disponible');
      return;
    }

    if (!pos) {
      showToast('error', 'Ubicación No Disponible', 'Esperando señal GPS...');
      return;
    }

    const startLocation = emergencyMode === 'atender_emergencia' ? selectedLocation : pos;
    const endLocation = emergencyMode === 'atender_emergencia' ? pos : hospital;

    try {
      const routeData = await calculateRoute(startLocation, endLocation);
      if (!routeData) return;

      drawRoute(routeData.geometry);
      
      setRouteInfo({
        distance: (routeData.distance / 1000).toFixed(1),
        duration: Math.round(routeData.duration / 60),
        hospital: hospital?.nombre || 'Ubicación Actual',
        address: hospital?.direccion || 'Su ubicación',
        rawDistance: routeData.distance,
        rawDuration: routeData.duration
      });

      const patientInfo = includePatientInfo ? {
        age: age,
        sex: sex,
        emergencyType: emergencyType,
        condition: patientCondition,
        vitalSigns: vitalSigns,
        timestamp: new Date().toLocaleString(),
        emergencyLocation: selectedLocation ? searchQuery : 'Ubicación actual'
      } : {
        timestamp: new Date().toLocaleString(),
        emergencyLocation: selectedLocation ? searchQuery : 'Ubicación actual',
        infoProvided: false
      };

      if (emergencyMode === 'trasladar_paciente') {
        safeSend({
          type: 'patient_transfer_notification',
          ambulanceId: 'UVI-01',
          hospitalId: hospital.id,
          patientInfo: patientInfo,
          ambulanceLocation: startLocation,
          eta: Math.round(routeData.duration / 60),
          distance: (routeData.distance / 1000).toFixed(1),
          routeGeometry: routeData.geometry,
          rawDistance: routeData.distance,
          rawDuration: routeData.duration,
          emergencyMode: emergencyMode
        });

        setHospitalNotification({
          type: 'pending',
          message: `⏳ Esperando confirmación de ${hospital.nombre}...`
        });
      }

      setIsNavigating(true);
      setDestination(endLocation);
      setAmbulanceStatus('en_ruta');

      onEmergencyDrawerClose();
      
      showToast('success', 
        emergencyMode === 'atender_emergencia' ? 'Ruta a Emergencia Calculada' : 'Emergencia Reportada', 
        emergencyMode === 'atender_emergencia' ? 'Navegando al punto de emergencia' : 'Hospital notificado y ruta calculada'
      );

      resetEmergencyForm();

    } catch (error) {
      console.error('❌ Error iniciando emergencia:', error);
      showToast('error', 'Error del Sistema', 'No se pudo procesar la emergencia');
    }
  };

  const cancelNavigation = () => {
    if (destination) {
      safeSend({
        type: 'cancel_navigation',
        ambulanceId: 'UVI-01',
        hospitalId: destination.id
      });
    }
    
    setIsNavigating(false);
    setDestination(null);
    setAmbulanceStatus('disponible');
    clearRoute();
    setHospitalNotification(null);
    showToast('info', 'Navegación Cancelada', 'Ruta eliminada del sistema');
  };

  // ---------- EFECTOS DE INICIALIZACIÓN ----------
  useEffect(() => {
    isMounted.current = true;

    if (!mapContainer.current) return;

    const mapStyle = colorMode === 'light' 
      ? 'mapbox://styles/mapbox/navigation-day-v1'
      : 'mapbox://styles/mapbox/navigation-night-v1';

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [-101.1969, 19.7024],
      zoom: 15,
      pitch: 60,
      bearing: 0,
      antialias: true
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstance.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserLocation: false,
      showAccuracyCircle: true
    }), 'top-right');

    mapInstance.on('load', () => {
      console.log('🗺️ Mapa GPS cargado correctamente');
      map.current = mapInstance;
      
      addTrafficLayer();
      startPreciseLocationTracking();
      connectWebSocket();
    });

    return () => {
      isMounted.current = false;
      
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        try {
          ws.current.close(1000, 'Componente desmontado');
        } catch (e) {}
      }
      
      cleanupMarkers();
      try { mapInstance.remove(); } catch (e) {}
    };
  }, [colorMode]);

  // Actualizar hospitales cuando cambia la posición
  useEffect(() => {
    if (pos && hospitals.length > 0) {
      const updatedHospitals = hospitals.map(hospital => {
        if (hospital.lat && hospital.lng) {
          const distance = calculateDistance(
            pos.lat, pos.lng,
            hospital.lat, hospital.lng
          );
          return { ...hospital, distance };
        }
        return hospital;
      }).sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      setHospitals(updatedHospitals);
      updateHospitalMarkers(updatedHospitals);
    }
  }, [pos]);

  // Solicitar actualización periódica de hospitales
  useEffect(() => {
    if (wsConnected) {
      const interval = setInterval(() => {
        loadAllHospitalsFromAPI(); // Cargar de API HTTP
        safeSend({
          type: 'request_hospitals_list'
        });
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [wsConnected]);

  // ---------- FUNCIONES UTILITARIAS ----------
  const safeSend = (message) => {
    try {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
    }
  };

  const sendLocationUpdate = (location, speed, heading) => {
    safeSend({
      type: 'location_update',
      ambulanceId: 'UVI-01',
      location: location,
      speed: speed,
      heading: heading,
      status: ambulanceStatus,
      accuracy: accuracy,
      timestamp: new Date().toISOString()
    });
  };

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

  const refreshHospitals = () => {
    loadAllHospitalsFromAPI();
    safeSend({
      type: 'request_hospitals_list'
    });
    showToast('info', 'Actualizando', 'Buscando hospitales disponibles...');
  };

  const reconnect = () => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    connectionAttempts.current = 0;
    connectWebSocket();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedLocation(null);
    if (emergencyMarker.current) {
      emergencyMarker.current.remove();
      emergencyMarker.current = null;
    }
  };

  const cleanupMarkers = () => {
    hospitalMarkers.current.forEach(marker => marker.remove());
    hospitalMarkers.current = [];
    
    if (ambulanceMarker.current) {
      ambulanceMarker.current.remove();
      ambulanceMarker.current = null;
    }
    
    if (emergencyMarker.current) {
      emergencyMarker.current.remove();
      emergencyMarker.current = null;
    }
  };

  const resetEmergencyForm = () => {
    setEmergencyStep('mode');
    setEmergencyMode('');
    setIncludePatientInfo(false);
    setAge('');
    setSex('');
    setEmergencyType('');
    setPatientCondition('');
    setVitalSigns({
      heartRate: '',
      bloodPressure: '',
      oxygenSaturation: '',
      respiratoryRate: ''
    });
    setSelectedHospital('');
    setSearchQuery('');
    setSelectedLocation(null);
  };

  // ---------- RENDER ----------
  return (
    <ChakraProvider theme={theme}>
      <Box height="100vh" display="flex" flexDirection="column" bg={bgColor}>
        {/* Header */}
        <Box bg={headerBg} p={3} boxShadow="sm" borderBottom="1px" borderColor={borderColor}>
          <HStack justifyContent="space-between" alignItems="center">
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color={textColor}>
                <FaAmbulance style={{ display: 'inline', marginRight: '8px' }} /> Ambulancia UVI-01 - {ambulanceStatus.toUpperCase()}
              </Text>
              <Text fontSize="sm" color={textColor}>
                {isNavigating ? `En ruta a ${destination?.nombre || 'hospital'}` : 'Modo disponible'}
                <Badge ml={2} colorScheme={wsConnected ? "green" : isConnecting ? "yellow" : "red"} fontSize="xs">
                  {wsConnected ? "CONECTADO" : isConnecting ? "CONECTANDO..." : "DESCONECTADO"}
                </Badge>
              </Text>
            </VStack>

            <HStack spacing={4}>
              <Box bg="blue.50" p={2} borderRadius="md" border="1px" borderColor="blue.200">
                <VStack spacing={0} align="center">
                  <Text fontSize="lg" fontWeight="bold" color="blue.800">
                    <FaTachometerAlt style={{ display: 'inline', marginRight: '4px' }} /> {speed} km/h
                  </Text>
                  <Text fontSize="xs" color="blue.600">Velocidad</Text>
                </VStack>
              </Box>
              
              <Box bg="green.50" p={2} borderRadius="md" border="1px" borderColor="green.200">
                <VStack spacing={0} align="center">
                  <Text fontSize="lg" fontWeight="bold" color="green.800">
                    <FaRoad style={{ display: 'inline', marginRight: '4px' }} /> {tripDistance.toFixed(1)} km
                  </Text>
                  <Text fontSize="xs" color="green.600">Distancia</Text>
                </VStack>
              </Box>
              
              <Badge colorScheme="purple" fontSize="md" p={2} borderRadius="md">
                <FaHospital style={{ display: 'inline', marginRight: '4px' }} /> {hospitals.filter(h => h.connected).length}/{hospitals.filter(h => h.activo).length} HOSPITALES
              </Badge>
              
              {routeInfo && (
                <Badge colorScheme="teal" fontSize="md" p={2} borderRadius="md">
                  <FaClock style={{ display: 'inline', marginRight: '4px' }} /> {routeInfo.duration} min • <FaRoad style={{ display: 'inline', marginRight: '4px' }} /> {routeInfo.distance} km
                </Badge>
              )}
              
              <Button 
                size="sm" 
                colorScheme={trafficEnabled ? "orange" : "blue"}
                onClick={toggleTraffic}
                variant={trafficEnabled ? "solid" : "outline"}
                leftIcon={trafficEnabled ? <FaTimes /> : <FaRoad />}
              >
                TRÁFICO
              </Button>
              
              <ColorModeToggle />
            </HStack>
          </HStack>
        </Box>

        {/* Contenido principal */}
        <Box flex={1} display="flex">
          {/* Panel lateral */}
          <Box width="400px" bg={cardBg} p={4} overflowY="auto" boxShadow="md" borderRight="1px" borderColor={borderColor}>
            <VStack spacing={4} align="stretch">
              <Button 
                colorScheme="red" 
                size="lg" 
                onClick={onEmergencyDrawerOpen}
                leftIcon={<FaExclamationTriangle />}
                isDisabled={!wsConnected}
                height="60px"
                fontSize="lg"
                fontWeight="bold"
              >
                SERVICIO DE EMERGENCIA
              </Button>

              {selectedLocation && (
                <Button 
                  colorScheme="orange" 
                  size="md"
                  onClick={goToEmergencyLocation}
                  leftIcon={<FaMapMarkerAlt />}
                  variant="outline"
                >
                  IR AL LUGAR DEL ACCIDENTE
                </Button>
              )}

              <Card bg={wsConnected ? "green.50" : isConnecting ? "yellow.50" : "red.50"} 
                border="1px" borderColor={wsConnected ? "green.200" : isConnecting ? "yellow.200" : "red.200"}>
                <CardBody p={3}>
                  <HStack justify="space-between">
                    <HStack>
                      <Box w="3" h="3" borderRadius="full" bg={wsConnected ? "green.400" : isConnecting ? "yellow.400" : "red.400"} />
                      <Text fontSize="sm" fontWeight="medium" color={wsConnected ? "green.800" : isConnecting ? "yellow.800" : "red.800"}>
                        {wsConnected ? 'Conectado' : isConnecting ? 'Conectando...' : 'Desconectado'}
                      </Text>
                    </HStack>
                    {!wsConnected && (
                      <Button size="sm" onClick={reconnect} colorScheme="orange" isDisabled={isConnecting}>
                        {isConnecting ? <Spinner size="sm" /> : <FaSync />}
                      </Button>
                    )}
                  </HStack>
                  
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    Hospitales activos: {hospitals.filter(h => h.connected).length} de {hospitals.filter(h => h.activo).length}
                  </Text>
                </CardBody>
              </Card>

              {routeInfo && (
                <Card bg="blue.50" border="1px" borderColor="blue.200">
                  <CardBody>
                    <Text fontWeight="bold" mb={2} color="blue.800">
                      <FaRoute style={{ display: 'inline', marginRight: '8px' }} /> RUTA ACTIVA
                    </Text>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" color="blue.700">
                        <strong>Destino:</strong> {routeInfo.hospital}
                      </Text>
                      <Text fontSize="sm" color="blue.700">
                        <strong>Distancia:</strong> {routeInfo.distance} km
                      </Text>
                      <Text fontSize="sm" color="blue.700">
                        <strong>Tiempo:</strong> {routeInfo.duration} min
                      </Text>
                      <Progress value={65} size="sm" width="100%" colorScheme="blue" mt={2} borderRadius="full" />
                    </VStack>
                    <Button 
                      size="sm" 
                      mt={3} 
                      colorScheme="red" 
                      onClick={cancelNavigation}
                      width="100%"
                      leftIcon={<FaTimesCircle />}
                    >
                      Cancelar Navegación
                    </Button>
                  </CardBody>
                </Card>
              )}

              <Card>
                <CardBody p={3}>
                  <HStack justify="space-between" mb={3}>
                    <Text fontSize="sm" fontWeight="bold">
                      <FaHospital style={{ display: 'inline', marginRight: '8px' }} /> Hospitales Disponibles
                    </Text>
                    <Button 
                      size="xs" 
                      onClick={refreshHospitals}
                      variant="ghost"
                      leftIcon={<FaSync />}
                    >
                      Actualizar
                    </Button>
                  </HStack>
                  
                  <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
                    {hospitals
                      .filter(h => h.activo) // Solo hospitales activos en BD
                      .slice(0, 5)
                      .map((hospital, index) => (
                        <HStack 
                          key={hospital.id}
                          p={2}
                          bg={hospital.connected ? "green.50" : "orange.50"}
                          borderRadius="md"
                          border="1px"
                          borderColor={hospital.connected ? "green.200" : "orange.200"}
                          opacity={hospital.connected ? 1 : 0.8}
                        >
                          <Badge 
                            colorScheme={hospital.connected ? "green" : "orange"}
                            minW="20px"
                            textAlign="center"
                          >
                            {index + 1}
                          </Badge>
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                              {hospital.nombre}
                            </Text>
                            <Text fontSize="2xs" color="gray.600" noOfLines={1}>
                              {hospital.distance ? `${hospital.distance.toFixed(1)} km` : 'Distancia N/A'}
                            </Text>
                          </VStack>
                          <Badge 
                            colorScheme={hospital.connected ? "green" : "orange"}
                            fontSize="2xs"
                          >
                            {hospital.connected ? '✅' : '🟡'}
                          </Badge>
                        </HStack>
                      ))}
                  </VStack>
                </CardBody>
              </Card>

              <VStack spacing={2}>
                <Button 
                  width="100%" 
                  colorScheme="blue" 
                  onClick={() => {
                    if (pos) {
                      map.current.flyTo({
                        center: [pos.lng, pos.lat],
                        zoom: 16,
                        bearing: heading,
                        pitch: 65,
                        duration: 1000
                      });
                    }
                  }}
                  leftIcon={<FaLocationArrow />}
                  variant="outline"
                >
                  Centrar en mi posición
                </Button>
                
                <Button 
                  width="100%" 
                  colorScheme="teal" 
                  onClick={onHospitalDrawerOpen}
                  leftIcon={<FaHospital />}
                  variant="outline"
                >
                  Ver todos los hospitales
                </Button>
              </VStack>
            </VStack>
          </Box>

          {/* Mapa */}
          <Box flex={1} position="relative">
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
            
            {/* Notificaciones */}
            {hospitalNotification && (
              <Box
                position="absolute"
                top="20px"
                right="20px"
                bg={hospitalNotification.type === 'accepted' ? "green.500" : 
                    hospitalNotification.type === 'rejected' ? "red.500" : "orange.500"}
                color="white"
                p={4}
                borderRadius="md"
                boxShadow="xl"
                maxWidth="400px"
                zIndex="1000"
              >
                <Alert status={hospitalNotification.type === 'accepted' ? 'success' : 
                              hospitalNotification.type === 'rejected' ? 'error' : 'warning'}>
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="md">
                      {hospitalNotification.type === 'accepted' ? 'Paciente Aceptado' :
                       hospitalNotification.type === 'rejected' ? 'Paciente Rechazado' : 'Esperando Confirmación'}
                    </AlertTitle>
                    <AlertDescription fontSize="sm">
                      {hospitalNotification.message}
                    </AlertDescription>
                  </Box>
                </Alert>
              </Box>
            )}

            {/* Información de ruta */}
            {routeInfo && (
              <Box
                position="absolute"
                top="20px"
                left="20px"
                bg={cardBg}
                color={textColor}
                p={4}
                borderRadius="md"
                boxShadow="xl"
                border="1px"
                borderColor={borderColor}
                zIndex="1000"
                minWidth="300px"
              >
                <Text fontWeight="bold" mb={2} color="blue.600">
                  <FaRoute style={{ display: 'inline', marginRight: '8px' }} /> RUTA ACTIVA
                </Text>
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm">
                    <strong>Destino:</strong> {routeInfo.hospital}
                  </Text>
                  <Text fontSize="sm">
                    <strong>Distancia:</strong> {routeInfo.distance} km
                  </Text>
                  <Text fontSize="sm">
                    <strong>Tiempo:</strong> {routeInfo.duration} min
                  </Text>
                  <Progress value={65} size="sm" width="100%" colorScheme="blue" mt={2} borderRadius="full" />
                </VStack>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Drawer de emergencia */}
      <Drawer
        isOpen={isEmergencyDrawerOpen}
        placement="right"
        onClose={() => {
          onEmergencyDrawerClose();
          resetEmergencyForm();
        }}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader bg="red.600" color="white">
            <FaExclamationTriangle style={{ display: 'inline', marginRight: '12px' }} /> SERVICIO DE EMERGENCIA
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={6} align="stretch" pt={4}>
              {/* Paso 1: Selección de modo */}
              {emergencyStep === 'mode' && (
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb={4} textAlign="center">
                    ¿Qué tipo de servicio necesita?
                  </Text>
                  
                  <VStack spacing={3}>
                    <Button
                      size="lg"
                      height="80px"
                      width="100%"
                      colorScheme="orange"
                      onClick={() => {
                        setEmergencyMode('atender_emergencia');
                        setEmergencyStep('location');
                      }}
                      leftIcon={<FaMapMarkerAlt />}
                      justifyContent="flex-start"
                      textAlign="left"
                      px={4}
                    >
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="bold">ATENDER EMERGENCIA</Text>
                        <Text fontSize="sm" opacity={0.8}>Ir a ubicación específica</Text>
                      </VStack>
                    </Button>

                    <Button
                      size="lg"
                      height="80px"
                      width="100%"
                      colorScheme="blue"
                      onClick={() => {
                        setEmergencyMode('trasladar_paciente');
                        setEmergencyStep('patient');
                      }}
                      leftIcon={<FaHospital />}
                      justifyContent="flex-start"
                      textAlign="left"
                      px={4}
                    >
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="bold">TRASLADAR PACIENTE</Text>
                        <Text fontSize="sm" opacity={0.8}>Llevar a hospital</Text>
                      </VStack>
                    </Button>
                  </VStack>
                </Box>
              )}

              {/* Paso 2: Información del paciente */}
              {emergencyStep === 'patient' && (
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb={4}>
                    Información del Paciente
                  </Text>
                  
                  <Accordion defaultIndex={[0]} allowMultiple>
                    <AccordionItem>
                      <AccordionButton>
                        <Box flex="1" textAlign="left">
                          <Text fontWeight="bold"><FaUserMd style={{ display: 'inline', marginRight: '8px' }} /> Información básica (Opcional)</Text>
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel pb={4}>
                        <Checkbox 
                          colorScheme="blue" 
                          isChecked={includePatientInfo}
                          onChange={(e) => setIncludePatientInfo(e.target.checked)}
                          mb={4}
                        >
                          Incluir información del paciente
                        </Checkbox>

                        {includePatientInfo && (
                          <VStack spacing={3}>
                            <HStack spacing={3} width="100%">
                              <FormControl>
                                <FormLabel fontSize="sm">Edad</FormLabel>
                                <NumberInput value={age} onChange={(value) => setAge(value)}>
                                  <NumberInputField placeholder="Años" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper>
                                      <AddIcon fontSize="10px" />
                                    </NumberIncrementStepper>
                                    <NumberDecrementStepper>
                                      <MinusIcon fontSize="10px" />
                                    </NumberDecrementStepper>
                                  </NumberInputStepper>
                                </NumberInput>
                              </FormControl>
                              
                              <FormControl>
                                <FormLabel fontSize="sm">Sexo</FormLabel>
                                <Select
                                  value={sex}
                                  onChange={(e) => setSex(e.target.value)}
                                  placeholder="Seleccionar"
                                >
                                  <option value="M">Masculino</option>
                                  <option value="F">Femenino</option>
                                  <option value="O">Otro</option>
                                </Select>
                              </FormControl>
                            </HStack>

                            <FormControl>
                              <FormLabel fontSize="sm">Tipo de emergencia</FormLabel>
                              <Input
                                value={emergencyType}
                                onChange={(e) => setEmergencyType(e.target.value)}
                                placeholder="Ej: Traumatismo, Infarto, etc."
                              />
                            </FormControl>

                            <FormControl>
                              <FormLabel fontSize="sm">Condición actual</FormLabel>
                              <Select
                                value={patientCondition}
                                onChange={(e) => setPatientCondition(e.target.value)}
                                placeholder="Seleccionar condición"
                              >
                                <option value="estable">Estable</option>
                                <option value="grave">Grave</option>
                                <option value="critico">Crítico</option>
                                <option value="inconsciente">Inconsciente</option>
                              </Select>
                            </FormControl>
                          </VStack>
                        )}
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                </Box>
              )}

              {/* Paso 2: Ubicación de emergencia */}
              {emergencyStep === 'location' && (
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb={4}>
                    <FaMapMarkerAlt style={{ display: 'inline', marginRight: '8px' }} /> Ubicación de la Emergencia
                  </Text>
                  
                  <VStack spacing={3}>
                    <InputGroup size="lg">
                      <Input
                        placeholder="Buscar dirección con número..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (e.target.value.length >= 3) {
                            searchAddresses();
                          } else {
                            setSearchResults([]);
                          }
                        }}
                      />
                      <InputRightElement>
                        {isSearching ? (
                          <Spinner size="sm" />
                        ) : searchQuery ? (
                          <IconButton
                            aria-label="Clear search"
                            icon={<CloseIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={clearSearch}
                          />
                        ) : (
                          <SearchIcon color="gray.400" />
                        )}
                      </InputRightElement>
                    </InputGroup>

                    {searchResults.length > 0 && (
                      <Box maxH="200px" overflowY="auto" width="100%">
                        {searchResults.map((result, index) => (
                          <Box
                            key={result.id}
                            p={3}
                            borderBottom="1px"
                            borderColor="gray.200"
                            cursor="pointer"
                            _hover={{ bg: "blue.50" }}
                            onClick={() => selectSearchResult(result)}
                          >
                            <HStack>
                              <Box color="blue.500">{index + 1}.</Box>
                              <VStack align="start" spacing={0} flex={1}>
                                <Text fontSize="sm" fontWeight="medium">{result.place_name}</Text>
                                <Text fontSize="xs" color="gray.500">
                                  {result.type === 'address' ? 'Dirección exacta' : 'Lugar de interés'}
                                </Text>
                              </VStack>
                            </HStack>
                          </Box>
                        ))}
                      </Box>
                    )}

                    <Button 
                      colorScheme="blue" 
                      variant="outline"
                      onClick={() => {
                        setSelectedLocation(null);
                        setSearchQuery('');
                        showToast('info', 'Usando Ubicación Actual', 'Se utilizará su ubicación GPS actual como emergencia');
                      }}
                      width="100%"
                      leftIcon={<FaLocationArrow />}
                    >
                      Usar Mi Ubicación Actual
                    </Button>
                  </VStack>
                </Box>
              )}

              {/* Paso 3: Selección de hospital */}
              {emergencyStep === 'hospital' && (
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb={4}>
                    {emergencyMode === 'atender_emergencia' ? 
                      <><FaCheck style={{ display: 'inline', marginRight: '8px' }} /> Confirmar Destino</> : 
                      <><FaHospital style={{ display: 'inline', marginRight: '8px' }} /> Hospital Destino</>
                    }
                  </Text>
                  
                  {emergencyMode === 'atender_emergencia' ? (
                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Ruta a Emergencia</AlertTitle>
                        <AlertDescription>
                          Se calculará la ruta más rápida desde la emergencia hasta su ubicación
                        </AlertDescription>
                      </Box>
                    </Alert>
                  ) : (
                    <VStack spacing={3} maxH="400px" overflowY="auto">
                      {hospitals
                        .filter(h => h.activo) // Solo hospitales activos en BD
                        .map((hospital, index) => (
                          <Card
                            key={hospital.id}
                            bg={selectedHospital === hospital.id ? "blue.50" : "white"}
                            border="1px"
                            borderColor={
                              selectedHospital === hospital.id ? "blue.300" :
                              hospital.connected ? "green.300" : "orange.300"
                            }
                            cursor={hospital.connected ? "pointer" : "not-allowed"}
                            onClick={() => hospital.connected && setSelectedHospital(hospital.id)}
                            opacity={hospital.connected ? 1 : 0.8}
                            _hover={{ borderColor: hospital.connected ? "blue.400" : "orange.400" }}
                          >
                            <CardBody p={3}>
                              <HStack justify="space-between" mb={2}>
                                <VStack align="start" spacing={0}>
                                  <HStack>
                                    <Text fontWeight="bold" fontSize="sm">
                                      {index + 1}. {hospital.nombre}
                                    </Text>
                                    {index === 0 && hospital.distance && (
                                      <Badge colorScheme="orange" fontSize="2xs">
                                        MÁS CERCANO
                                      </Badge>
                                    )}
                                    {hospital.connected && (
                                      <Badge colorScheme="green" fontSize="2xs">
                                        CONECTADO
                                      </Badge>
                                    )}
                                    {!hospital.connected && hospital.activo && (
                                      <Badge colorScheme="orange" fontSize="2xs">
                                        NO CONECTADO
                                      </Badge>
                                    )}
                                  </HStack>
                                  <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                    {hospital.direccion}
                                  </Text>
                                </VStack>
                                <Badge 
                                  colorScheme={hospital.connected ? "green" : "orange"} 
                                  fontSize="2xs"
                                >
                                  {hospital.connected ? <FaCheck /> : <FaTimes />}
                                </Badge>
                              </HStack>
                              
                              <HStack spacing={4} fontSize="2xs">
                                {hospital.distance && (
                                  <Text color="green.600" fontWeight="bold">
                                    <FaRoad style={{ display: 'inline', marginRight: '2px' }} /> {hospital.distance.toFixed(1)} km
                                  </Text>
                                )}
                                {hospital.distance && (
                                  <Text color="blue.600">
                                    <FaClock style={{ display: 'inline', marginRight: '2px' }} /> ~{Math.round(hospital.distance * 2)} min
                                  </Text>
                                )}
                                {hospital.camasDisponibles && (
                                  <Text color="purple.600">
                                    <FaBed style={{ display: 'inline', marginRight: '2px' }} /> {hospital.camasDisponibles}
                                  </Text>
                                )}
                              </HStack>
                            </CardBody>
                          </Card>
                        ))}
                    </VStack>
                  )}
                </Box>
              )}

              {/* Navegación entre pasos */}
              <HStack spacing={3} width="100%" justify="space-between" pt={4}>
                <Button 
                  variant="outline" 
                  onClick={emergencyStep === 'mode' ? () => {
                    onEmergencyDrawerClose();
                    resetEmergencyForm();
                  } : prevStep}
                  size="lg"
                  flex={1}
                  leftIcon={<FaArrowLeft />}
                >
                  {emergencyStep === 'mode' ? 'Cancelar' : 'Atrás'}
                </Button>
                
                {emergencyStep !== 'hospital' ? (
                  <Button 
                    colorScheme="blue" 
                    onClick={nextStep}
                    isDisabled={
                      (emergencyStep === 'mode' && !emergencyMode) ||
                      (emergencyStep === 'location' && !selectedLocation && !searchQuery)
                    }
                    size="lg"
                    flex={1}
                    leftIcon={<FaArrowRight />}
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button 
                    colorScheme="red" 
                    onClick={startEmergency}
                    isDisabled={emergencyMode === 'trasladar_paciente' && !selectedHospital}
                    size="lg"
                    flex={1}
                    fontSize="md"
                    fontWeight="bold"
                    leftIcon={emergencyMode === 'atender_emergencia' ? <FaRoute /> : <FaHospital />}
                  >
                    {emergencyMode === 'atender_emergencia' ? 'CALCULAR RUTA' : 'CONFIRMAR ENVÍO'}
                  </Button>
                )}
              </HStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Drawer de hospitales */}
      <Drawer
        isOpen={isHospitalDrawerOpen}
        placement="right"
        onClose={onHospitalDrawerClose}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader bg="blue.600" color="white">
            <FaHospital style={{ display: 'inline', marginRight: '12px' }} /> HOSPITALES DISPONIBLES
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={4} align="stretch" pt={4}>
              <HStack justify="space-between">
                <Text fontWeight="bold" fontSize="lg">
                  {hospitals.filter(h => h.activo).length} hospitales activos en sistema
                </Text>
                <Button size="sm" onClick={refreshHospitals} variant="outline" leftIcon={<FaSync />}>
                  Actualizar
                </Button>
              </HStack>

              <Divider />

              <VStack spacing={3} align="stretch" maxH="500px" overflowY="auto">
                {hospitals
                  .filter(h => h.activo) // Solo hospitales activos en BD
                  .map((hospital, index) => (
                    <Card
                      key={hospital.id}
                      border="1px"
                      borderColor={hospital.connected ? "green.200" : "orange.200"}
                      bg={hospital.connected ? "green.50" : "orange.50"}
                    >
                      <CardBody p={3}>
                        <VStack align="start" spacing={2}>
                          <HStack justify="space-between" width="100%">
                            <Text fontWeight="bold" fontSize="sm">
                              {index + 1}. {hospital.nombre}
                            </Text>
                            <Badge colorScheme={hospital.connected ? "green" : "orange"} fontSize="2xs">
                              {hospital.connected ? '✅ CONECTADO' : '🟡 ACTIVO (SIN CONEXIÓN)'}
                            </Badge>
                          </HStack>
                          
                          <Text fontSize="xs" color="gray.600">
                            <FaMapMarkerAlt style={{ display: 'inline', marginRight: '4px' }} /> {hospital.direccion}
                          </Text>
                          
                          <HStack spacing={4} fontSize="2xs" width="100%">
                            {hospital.distance && (
                              <Box>
                                <Text fontWeight="bold" color="green.600">
                                  <FaRoad style={{ display: 'inline', marginRight: '2px' }} /> {hospital.distance.toFixed(1)} km
                                </Text>
                                <Text fontSize="xs" color="gray.500">Distancia</Text>
                              </Box>
                            )}
                            
                            {hospital.distance && (
                              <Box>
                                <Text fontWeight="bold" color="blue.600">
                                  <FaClock style={{ display: 'inline', marginRight: '2px' }} /> ~{Math.round(hospital.distance * 2)} min
                                </Text>
                                <Text fontSize="xs" color="gray.500">Tiempo estimado</Text>
                              </Box>
                            )}
                            
                            {hospital.camasDisponibles && (
                              <Box>
                                <Text fontWeight="bold" color="purple.600">
                                  <FaBed style={{ display: 'inline', marginRight: '2px' }} /> {hospital.camasDisponibles}
                                </Text>
                                <Text fontSize="xs" color="gray.500">Camas disp.</Text>
                              </Box>
                            )}
                          </HStack>
                          
                          {hospital.especialidades?.length > 0 && (
                            <Text fontSize="2xs" color="gray.600">
                              <FaHospital style={{ display: 'inline', marginRight: '4px' }} /> {hospital.especialidades.slice(0, 3).join(', ')}
                            </Text>
                          )}
                          
                          <Button
                            size="xs"
                            colorScheme="blue"
                            isDisabled={!hospital.connected}
                            onClick={() => {
                              setSelectedHospital(hospital.id);
                              onHospitalDrawerClose();
                              showToast('info', 'Hospital Seleccionado', hospital.nombre);
                            }}
                            leftIcon={<FaCheck />}
                          >
                            SELECCIONAR DESTINO
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
              </VStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </ChakraProvider>
  );
}