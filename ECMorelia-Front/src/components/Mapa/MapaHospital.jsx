// src/components/Mapa/MapaHospital.jsx
import React, { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
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
  Textarea,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Grid,
  GridItem,
  useToast,
} from "@chakra-ui/react";

// Configuración de Mapbox
mapboxgl.accessToken =
  "pk.eyJ1IjoiZWR1YXJkbzI1MGplbW0iLCJhIjoiY2xwYzVvdzc3MDNlYjJoazUzbzZsYjRwNiJ9.KsDXLdjWn2R4fMX-YIIU8g";

// -----------------------------
// MapaHospital - componente
// -----------------------------
function MapaHospital() {
  // Estado general
  const [map, setMap] = useState(null);
  const [activeAmbulances, setActiveAmbulances] = useState([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [patientNotifications, setPatientNotifications] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);

  // Modals & formularios
  const { isOpen: isNoteOpen, onOpen: onNoteOpen, onClose: onNoteClose } = useDisclosure();
  const { isOpen: isNotificationOpen, onOpen: onNotificationOpen, onClose: onNotificationClose } = useDisclosure();
  const [noteMessage, setNoteMessage] = useState("");
  const [patientInfo, setPatientInfo] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const toast = useToast();

  // Información del hospital (vendrá desde localStorage y backend)
  const [hospitalInfo, setHospitalInfo] = useState(null);

  // Refs
  const mapContainer = useRef(null);
  const ws = useRef(null);
  const ambulanceMarkers = useRef({});
  const hospitalMarker = useRef(null);
  const routeLayerIds = useRef([]);
  const reconnectTimeout = useRef(null);

  // -----------------------------
  // Helpers
  // -----------------------------
  const showToast = (status, title, description) => {
    toast({
      title,
      description,
      status,
      duration: 4000,
      isClosable: true,
      position: "top-right",
    });
  };

  // Seguridad: devuelve campo o valor por defecto
  const safe = (obj, key, fallback = "") => (obj && obj[key] !== undefined ? obj[key] : fallback);

  // -----------------------------
  // WebSocket: conectar (solo crea conexión)
  // -----------------------------
  const connectWebSocket = () => {
    try {
      if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
        console.log("WebSocket ya abierto/intentando abrir.");
        return;
      }

      console.log("🏥 Conectando hospital al WebSocket...");
      ws.current = new WebSocket("ws://localhost:3002/ws");

      ws.current.onopen = () => {
        console.log("✅ Hospital conectado al servidor WebSocket");
        setWsConnected(true);
        showToast("success", "Conectado al servidor", "Conexión WebSocket establecida");
        // NOTA: envío de registro será manejado por useEffect que observa wsConnected + hospitalInfo
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 Mensaje recibido en hospital:", data.type);

          switch (data.type) {
            case "connection_established":
              console.log("✅ Conexión WebSocket confirmada (server).");
              break;

            case "active_ambulances_update":
              setActiveAmbulances(data.ambulances || []);
              updateAmbulanceMarkers(data.ambulances || []);
              break;

            case "location_update":
              updateAmbulanceLocation(data);
              break;

            case "navigation_started":
            case "navigation_finished":
              updateAmbulanceStatus(data);
              break;

            case "patient_transfer_notification":
              handlePatientTransferNotification(data);
              break;

            case "route_update":
              if (data.routeGeometry) {
                displayRouteOnMap(data.routeGeometry, data.eta, data.distance);
                setActiveRoute({
                  ambulanceId: data.ambulanceId,
                  eta: data.eta,
                  distance: data.distance,
                  geometry: data.routeGeometry,
                });
              }
              break;

            case "patient_accepted":
              if (data.hospitalId === hospitalInfo?.id) {
                setPatientNotifications((prev) => prev.filter((n) => n.notificationId !== data.notificationId));
                showToast("success", "Paciente aceptado", "Se ha confirmado la recepción del paciente");
              }
              break;

            case "error":
              console.error("❌ Error del servidor:", data.message);
              showToast("error", "Error del servidor", data.message || "Error desconocido");
              break;

            default:
              console.log("📨 Mensaje no procesado:", data);
          }
        } catch (error) {
          console.error("❌ Error procesando mensaje WS:", error);
        }
      };

      ws.current.onclose = (event) => {
        console.log("🔌 WebSocket cerrado:", event.code, event.reason);
        setWsConnected(false);

        // Reconexión automática salvo cierre normal (1000)
        if (event.code !== 1000) {
          showToast("warning", "Conexión perdida", "Reconectando WebSocket...");
          reconnectTimeout.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error("❌ Error WebSocket:", error);
        setWsConnected(false);
        showToast("error", "Error WebSocket", "No se pudo establecer conexión WebSocket");
      };
    } catch (error) {
      console.error("❌ Error al crear WebSocket:", error);
    }
  };

  // Enviar mensaje seguro por ws
  const safeSend = (payload) => {
    try {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(payload));
      } else {
        console.warn("WS no abierto, no se envió:", payload);
      }
    } catch (err) {
      console.error("❌ safeSend error:", err);
    }
  };

  // -----------------------------
  // Handler: notificación de traslado
  // -----------------------------
  const handlePatientTransferNotification = (data) => {
    console.log("🚨 Notificación de traslado recibida:", data);
    const notificationData = {
      ...data,
      timestamp: new Date().toLocaleString(),
      id: data.notificationId || `notif_${Date.now()}`,
    };

    setPatientNotifications((prev) => [...prev, notificationData]);
    setSelectedNotification(notificationData);

    if (data.routeGeometry) {
      displayRouteOnMap(data.routeGeometry, data.eta, data.distance);
      setActiveRoute({
        ambulanceId: data.ambulanceId,
        eta: data.eta,
        distance: data.distance,
        geometry: data.routeGeometry,
      });
    }

    showToast("info", "Nuevo paciente en camino", `Ambulancia ${data.ambulanceInfo?.id || ""} - ETA: ${data.eta || "?"} min`);
    onNotificationOpen();
  };

  // -----------------------------
  // Rutas / Mapbox helpers
  // -----------------------------
  const clearRouteFromMap = () => {
    if (!map) return;
    routeLayerIds.current.forEach((id) => {
      if (map.getLayer(id)) {
        try {
          map.removeLayer(id);
        } catch (e) {
          /* ignore */
        }
      }
      if (map.getSource(id)) {
        try {
          map.removeSource(id);
        } catch (e) {
          /* ignore */
        }
      }
    });
    routeLayerIds.current = [];
    setActiveRoute(null);
  };

  const displayRouteOnMap = (routeGeometry, eta, distance) => {
    if (!map || !routeGeometry || !Array.isArray(routeGeometry)) return;

    // Limpiar ruta anterior
    clearRouteFromMap();

    const routeId = "hospital-route";
    const routeColor = "#00FFFC";

    // Si la source ya existe (por seguridad) removerla
    if (map.getSource(routeId)) {
      try {
        map.removeLayer(routeId);
        map.removeSource(routeId);
      } catch (e) {
        // ignore
      }
    }

    // Agregar fuente y capas
    map.addSource(routeId, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: routeGeometry,
        },
        properties: {},
      },
    });

    map.addLayer({
      id: routeId,
      type: "line",
      source: routeId,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": routeColor, "line-width": 6, "line-opacity": 0.95 },
    });

    map.addLayer(
      {
        id: routeId + "-glow",
        type: "line",
        source: routeId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": routeColor, "line-width": 12, "line-opacity": 0.35, "line-blur": 1.5 },
      },
      routeId
    );

    map.addLayer(
      {
        id: routeId + "-outline",
        type: "line",
        source: routeId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#FFFFFF", "line-width": 10, "line-opacity": 0.2 },
      },
      routeId + "-glow"
    );

    routeLayerIds.current = [routeId, routeId + "-glow", routeId + "-outline"];
    console.log("🗺️ Ruta mostrada en el mapa del hospital");
  };

  const fitMapToRoute = (routeGeometry) => {
    if (!map || !routeGeometry) return;
    const bounds = new mapboxgl.LngLatBounds();
    routeGeometry.forEach((coord) => {
      if (Array.isArray(coord) && coord.length >= 2) bounds.extend([coord[0], coord[1]]);
    });
    // incluir hospital si existe
    if (hospitalInfo?.lng && hospitalInfo?.lat) bounds.extend([hospitalInfo.lng, hospitalInfo.lat]);
    map.fitBounds(bounds, { padding: 100, duration: 2000, pitch: 45 });
  };

  // -----------------------------
  // Markers ambulancias / hospital
  // -----------------------------
  const createAmbulanceMarkerElement = (ambulance) => {
    const wrapper = document.createElement("div");
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
    wrapper.style.cursor = "pointer";
    wrapper.style.transformOrigin = "center center";
    return wrapper;
  };

  const addHospitalMarker = (mapInstance) => {
    if (!hospitalInfo || !mapInstance) return;

    // remover marcador antiguo si existe
    try {
      if (hospitalMarker.current) {
        hospitalMarker.current.remove();
        hospitalMarker.current = null;
      }
    } catch (e) {
      /* ignore */
    }

    const popupHtml = `
      <div style="padding:12px; max-width:250px;">
        <strong style="font-size:16px;">🏥 ${hospitalInfo.nombre || "Hospital"}</strong><br/>
        <div style="margin:8px 0;">
          <strong>📍 Dirección:</strong> ${hospitalInfo.direccion || "No disponible"}<br/>
          <strong>🏷️ ID:</strong> ${hospitalInfo.id || "N/A"}
        </div>
        <em style="color:#666; font-size:12px;">Hospital registrado y operativo</em>
      </div>
    `;

    const el = document.createElement("div");
    el.innerHTML = `
      <div style="
        width:50px;
        height:50px;
        background:#4caf50;
        border:3px solid white;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-weight:bold;
        font-size:24px;
        box-shadow:0 4px 12px rgba(0,0,0,0.3);
      ">🏥</div>
    `;
    el.style.cursor = "pointer";

    hospitalMarker.current = new mapboxgl.Marker(el)
      .setLngLat([hospitalInfo.lng || -101.1969319, hospitalInfo.lat || 19.702428])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml))
      .addTo(mapInstance);
  };

  const updateAmbulanceMarkers = (ambulances) => {
    if (!map) return;

    // eliminar marcadores antiguos
    Object.values(ambulanceMarkers.current).forEach((marker) => {
      try {
        marker.remove();
      } catch (e) {
        /* ignore */
      }
    });
    ambulanceMarkers.current = {};

    // crear nuevos
    (ambulances || []).forEach((ambulance) => {
      if (ambulance?.location?.lat !== undefined && ambulance?.location?.lng !== undefined) {
        const el = createAmbulanceMarkerElement(ambulance);
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([ambulance.location.lng, ambulance.location.lat])
          .addTo(map);

        const popupHtml = `
          <div style="padding:8px;">
            <strong>🚑 ${ambulance.id || ""}</strong><br/>
            Placa: ${ambulance.placa || "N/A"}<br/>
            Tipo: ${ambulance.tipo || "N/A"}<br/>
            Estado: ${ambulance.status === "en_ruta" ? "EN RUTA" : "DISPONIBLE"}<br/>
            Velocidad: ${ambulance.speed || 0} km/h
          </div>
        `;
        marker.setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml));
        ambulanceMarkers.current[ambulance.id] = marker;
      }
    });
  };

  const updateAmbulanceLocation = (data) => {
    const marker = ambulanceMarkers.current[data.ambulanceId];
    if (marker && data.location) {
      marker.setLngLat([data.location.lng, data.location.lat]);
      const el = marker.getElement();
      if (el) el.style.transform = `rotate(${data.location.heading || 0}deg)`;
      setActiveAmbulances((prev) =>
        prev.map((amb) => (amb.id === data.ambulanceId ? { ...amb, location: data.location, speed: data.speed } : amb))
      );
    }
  };

  const updateAmbulanceStatus = (data) => {
    setActiveAmbulances((prev) => prev.map((amb) => (amb.id === data.ambulanceId ? { ...amb, status: data.status } : amb)));
  };

  // -----------------------------
  // Efectos: conexión WS + carga del hospital + mapa
  // -----------------------------

  // 1) Crear conexión WebSocket al montar
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        try {
          ws.current.close(1000, "Componente desmontado");
        } catch (e) {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  // 2) Enviar registro del hospital al servidor cuando WS esté listo y hospitalInfo exista
  useEffect(() => {
    if (ws.current && wsConnected && hospitalInfo) {
      safeSend({
        type: "register_hospital",
        hospital: hospitalInfo,
      });
      showToast("success", "Registrado", "Hospital registrado en servidor WebSocket");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsConnected, hospitalInfo]);

  // 3) Cargar hospital desde localStorage y verificar en backend
  useEffect(() => {
    const loadHospitalData = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem("hospitalInfo"));
        if (!stored || !stored.id) {
          console.warn("No hay hospitalInfo en localStorage");
          // podrías redirigir al login aquí si quieres
          return;
        }

        // Intentar obtener datos reales desde la API (verifica tu endpoint)
        try {
          const resp = await fetch(`${import.meta.env.VITE_API}/hospital/${stored.id}`);
          if (!resp.ok) {
            console.warn("No se obtuvo hospital desde la API, usando datos guardados en sesión.");
            // usar la info almacenada como fallback
            setHospitalInfo({
              id: stored.id,
              nombre: stored.nombre || "Hospital",
              direccion: stored.direccion || "",
              lat: stored.ubicacion?.lat || stored.lat,
              lng: stored.ubicacion?.lng || stored.lng,
            });
            return;
          }
          const dbHospital = await resp.json();
          setHospitalInfo({
            id: dbHospital.id_hospitales || stored.id,
            nombre: dbHospital.nombre || stored.nombre || "Hospital",
            direccion: dbHospital.direccion || stored.direccion || "",
            lat: stored.ubicacion?.lat || dbHospital.lat || 19.702428,
            lng: stored.ubicacion?.lng || dbHospital.lng || -101.1969319,
          });
        } catch (err) {
          console.error("Error fetching hospital:", err);
          // fallback a localStorage
          setHospitalInfo({
            id: stored.id,
            nombre: stored.nombre || "Hospital",
            direccion: stored.direccion || "",
            lat: stored.ubicacion?.lat || 19.702428,
            lng: stored.ubicacion?.lng || -101.1969319,
          });
        }
      } catch (error) {
        console.error("Error cargando hospital desde localStorage:", error);
      }
    };

    loadHospitalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4) Inicializar mapa cuando tengamos hospitalInfo (asegura center correcto)
  useEffect(() => {
    if (!hospitalInfo) return;
    if (!mapContainer.current) return;

    const center = [hospitalInfo.lng || -101.1969319, hospitalInfo.lat || 19.702428];

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom: 12,
    });

    mapInstance.addControl(new mapboxgl.NavigationControl());

    mapInstance.on("load", () => {
      setMap(mapInstance);
      addHospitalMarker(mapInstance);
    });

    // cleanup
    return () => {
      try {
        mapInstance.remove();
      } catch (e) {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalInfo]);

  // -----------------------------
  // Acciones / Botones
  // -----------------------------
  const acceptPatient = (notification) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      safeSend({
        type: "hospital_accept_patient",
        notificationId: notification.notificationId,
        hospitalId: hospitalInfo?.id,
        hospitalInfo,
      });

      setPatientNotifications((prev) => prev.filter((notif) => notif.notificationId !== notification.notificationId));
      showToast("success", "Paciente aceptado", "Se ha confirmado la recepción del paciente");
      onNotificationClose();
    } else {
      showToast("error", "Error", "No hay conexión con el servidor");
    }
  };

  const rejectPatient = (notification) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      safeSend({
        type: "hospital_reject_patient",
        notificationId: notification.notificationId,
        hospitalId: hospitalInfo?.id,
        reason: "Capacidad limitada - No hay camas disponibles",
      });

      setPatientNotifications((prev) => prev.filter((notif) => notif.notificationId !== notification.notificationId));
      clearRouteFromMap();
      showToast("warning", "Paciente rechazado", "Se ha notificado a la ambulancia");
      onNotificationClose();
    } else {
      showToast("error", "Error", "No hay conexión con el servidor");
    }
  };

  const sendNoteToDriver = () => {
    if (!selectedAmbulance || !noteMessage.trim()) {
      showToast("warning", "Advertencia", "Escribe un mensaje para el conductor");
      return;
    }

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      safeSend({
        type: "hospital_note",
        ambulanceId: selectedAmbulance.id,
        hospitalId: hospitalInfo?.id,
        note: {
          id: Date.now(),
          message: noteMessage,
          patientInfo,
          hospitalInfo,
          timestamp: new Date().toLocaleTimeString(),
        },
      });

      showToast("success", "Nota enviada", "Mensaje enviado al conductor de la ambulancia");
      setNoteMessage("");
      setPatientInfo("");
      onNoteClose();
    } else {
      showToast("error", "Error", "No hay conexión con el servidor");
    }
  };

  const requestRouteUpdate = (ambulanceId) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      safeSend({ type: "request_route_update", ambulanceId });
    } else {
      showToast("error", "Error", "No hay conexión con el servidor");
    }
  };

  const reconnectWebSocket = () => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    if (ws.current) {
      try {
        ws.current.close(1000, "Reconexion manual");
      } catch (e) {
        /* ignore */
      }
      ws.current = null;
    }
    connectWebSocket();
  };

  // -----------------------------
  // Protección del render: si hospitalInfo aún no existe mostramos loader
  // (esto se coloca después de todos los hooks)
  // -----------------------------
  if (!hospitalInfo) {
    return (
      <ChakraProvider theme={theme}>
        <Box p={10} textAlign="center">
          <Text fontSize="2xl" fontWeight="bold">
            Cargando información del hospital...
          </Text>
        </Box>
      </ChakraProvider>
    );
  }

  // -----------------------------
  // JSX principal (cuando hospitalInfo existe)
  // -----------------------------
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

              <Button size="sm" colorScheme={wsConnected ? "green" : "orange"} onClick={reconnectWebSocket}>
                {wsConnected ? "✅ Conectado" : "🔌 Reconectar"}
              </Button>
            </HStack>
          </HStack>
        </Box>

        {/* Contenido */}
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
                {activeAmbulances.map((ambulance) => (
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
                      <Text fontWeight="bold" color="red.600">
                        {ambulance.id}
                      </Text>
                      <Badge colorScheme={ambulance.status === "en_ruta" ? "green" : "orange"}>
                        {ambulance.status === "en_ruta" ? "EN RUTA" : "DISPONIBLE"}
                      </Badge>
                    </HStack>

                    <Text fontSize="sm" color="gray.600">
                      Placa: {ambulance.placa || "N/A"}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Tipo: {ambulance.tipo || "N/A"}
                    </Text>
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

            {/* Info de ruta activa */}
            {activeRoute && (
              <Box mt={6} p={4} bg="white" borderRadius="md" border="1px" borderColor="gray.200">
                <Text fontSize="lg" fontWeight="bold" mb={2} color="gray.700">
                  📊 Ruta Activa
                </Text>
                <VStack align="start" spacing={1}>
                  <Text>
                    <strong>Ambulancia:</strong> {activeRoute.ambulanceId}
                  </Text>
                  <Text>
                    <strong>Tiempo estimado:</strong> {activeRoute.eta} minutos
                  </Text>
                  <Text>
                    <strong>Distancia:</strong> {activeRoute.distance} km
                  </Text>
                </VStack>
                <Button size="sm" colorScheme="blue" width="100%" mt={3} onClick={() => activeRoute.geometry && fitMapToRoute(activeRoute.geometry)}>
                  🗺️ Ajustar mapa a ruta
                </Button>
              </Box>
            )}

            {/* Acciones */}
            {selectedAmbulance && (
              <VStack spacing={3} mt={6}>
                <Button colorScheme="blue" width="100%" onClick={onNoteOpen} disabled={!wsConnected}>
                  📋 Enviar Nota al Conductor
                </Button>
                {activeRoute && activeRoute.ambulanceId === selectedAmbulance.id && (
                  <Button colorScheme="purple" width="100%" onClick={() => requestRouteUpdate(selectedAmbulance.id)} disabled={!wsConnected}>
                    🔄 Actualizar Ruta
                  </Button>
                )}
              </VStack>
            )}
          </Box>

          {/* Mapa */}
          <Box flex={1} position="relative">
            <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

            {/* Info ruta sobre el mapa */}
            {activeRoute && (
              <Box position="absolute" top="20px" left="20px" bg="rgba(255,255,255,0.95)" p={3} borderRadius="md" boxShadow="lg" maxWidth="300px" zIndex="1">
                <Text fontWeight="bold" mb={2} color="gray.700">
                  📊 Ruta Activa - {activeRoute.ambulanceId}
                </Text>
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm">
                    <strong>🕐 ETA:</strong> {activeRoute.eta} minutos
                  </Text>
                  <Text fontSize="sm">
                    <strong>📏 Distancia:</strong> {activeRoute.distance} km
                  </Text>
                  <Text fontSize="sm">
                    <strong>🏥 Destino:</strong> {hospitalInfo.nombre}
                  </Text>
                </VStack>
                <Button size="xs" colorScheme="blue" mt={2} onClick={() => fitMapToRoute(activeRoute.geometry)}>
                  🗺️ Ajustar vista
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Modal: enviar nota */}
      <Modal isOpen={isNoteOpen} onClose={onNoteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>📋 Enviar Nota al Conductor</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                Para: {selectedAmbulance?.id} - {selectedAmbulance?.placa}
              </Text>

              <Textarea placeholder="Escribe tu mensaje para el conductor..." value={noteMessage} onChange={(e) => setNoteMessage(e.target.value)} rows={3} />

              <Textarea placeholder="Información del paciente (opcional)" value={patientInfo} onChange={(e) => setPatientInfo(e.target.value)} rows={2} />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onNoteClose}>
              Cancelar
            </Button>
            <Button colorScheme="blue" onClick={sendNoteToDriver} disabled={!wsConnected}>
              📤 Enviar Nota
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal: notificación paciente */}
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
                    <Text fontWeight="bold" mb={2}>
                      Información del Paciente:
                    </Text>
                    <VStack align="start" spacing={1}>
                      <Text>
                        <strong>Edad:</strong> {selectedNotification.patientInfo?.age || "No especificada"}
                      </Text>
                      <Text>
                        <strong>Sexo:</strong> {selectedNotification.patientInfo?.sex || "No especificado"}
                      </Text>
                      <Text>
                        <strong>Emergencia:</strong> {selectedNotification.patientInfo?.type || "No especificada"}
                      </Text>
                      {selectedNotification.patientInfo?.timestamp && <Text fontSize="sm" color="gray.600">Reportado: {selectedNotification.patientInfo.timestamp}</Text>}
                    </VStack>
                  </GridItem>

                  <GridItem>
                    <Text fontWeight="bold" mb={2}>
                      Información del Traslado:
                    </Text>
                    <VStack align="start" spacing={1}>
                      <Text>
                        <strong>ETA:</strong> {selectedNotification.eta || "Calculando..."}
                      </Text>
                      <Text>
                        <strong>Distancia:</strong> {selectedNotification.distance || "Calculando..."}
                      </Text>
                      <Text>
                        <strong>Ambulancia:</strong> {selectedNotification.ambulanceInfo?.placa || "N/A"}
                      </Text>
                      <Text>
                        <strong>Tipo:</strong> {selectedNotification.ambulanceInfo?.tipo || "N/A"}
                      </Text>
                    </VStack>
                  </GridItem>
                </Grid>

                <Box bg="blue.50" p={3} borderRadius="md" borderLeft="4px" borderColor="blue.500">
                  <Text fontSize="sm" fontWeight="bold" color="blue.700">
                    Tiempo estimado de llegada:
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color="blue.800">
                    {selectedNotification.eta || "Calculando..."} minutos
                  </Text>
                  <Text fontSize="sm" color="blue.600">
                    Distancia: {selectedNotification.distance || "Calculando..."} km
                  </Text>
                  <Button size="sm" colorScheme="blue" mt={2} onClick={() => selectedNotification.routeGeometry && fitMapToRoute(selectedNotification.routeGeometry)}>
                    🗺️ Ver ruta en el mapa
                  </Button>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" variant="outline" mr={3} onClick={() => rejectPatient(selectedNotification)} disabled={!wsConnected}>
              Rechazar Paciente
            </Button>
            <Button colorScheme="green" onClick={() => acceptPatient(selectedNotification)} disabled={!wsConnected}>
              ✅ Aceptar Paciente
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ChakraProvider>
  );
}

export default MapaHospital;
