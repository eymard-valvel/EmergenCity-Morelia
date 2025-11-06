import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { generarBitacoraPDF } from "./bitacora";

mapboxgl.accessToken = 'pk.eyJ1IjoiZWR1YXJkbzI1MGplbW0iLCJhIjoiY2xwYzVvdzc3MDNlYjJoazUzbzZsYjRwNiJ9.KsDXLdjWn2R4fMX-YIIU8g';

function App() {
  const [map, setMap] = useState(null);
const [pointA, setPointA] = useState(null); // Punto A sincronizado con ambulancia seleccionada
const [origin, setOrigin] = useState(null); // <-- AGREGA ESTA LÍNEA
  const [nearestAmbulance, setNearestAmbulance] = useState(null);
  const [route, setRoute] = useState([]);
  const [time, setTime] = useState(null);
  const [distance, setDistance] = useState(null);
const [selectedAmbulance, setSelectedAmbulance] = useState(null); // ambulancia seleccionada por click
const ambulanceMarkersRef = useRef({}); // almacenará { "A-01": MarkerInstance, ... }
  const hospitalMarkersRef = useRef([]); // <--- Línea nueva para almacenar marcadores de hospitales

  const [showModal, setShowModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [contador, setContador] = useState(0);
  const [t1, setT1] = useState(0);
  const [t2, setT2] = useState(0);
  const [d1, setD1] = useState(0);
  const [d2, setD2] = useState(0);
  const [direccionAccidente, setDireccionAccidente] = useState("");
  const [direccionAmbulancia, setDireccionAmbulancia] = useState("");

  useEffect(() => {
    const mapInstance = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-101.1969319, 19.702428],
      zoom: 12.8,
      
    });

    // REEMPLAZAR la configuración de directions:
const directions = new MapboxDirections({
  accessToken: mapboxgl.accessToken,
  unit: 'metric',
  profile: 'driving',
  controls: {
    instructions: false,
    profileSwitcher: false,
  },
  markers: false, // ❌ Esto quita los puntos A y B automáticos
});

// AGREGAR después de añadir el control al mapa:
mapInstance.addControl(directions, 'top-left');


directions.on('origin', async () => {
  const puntoA = directions.getOrigin().geometry.coordinates;
  setOrigin({ lng: puntoA[0], lat: puntoA[1] });

  // Obtener dirección del punto A
  const direccionA = await obtenerDireccionDesdeCoordenadas({ lng: puntoA[0], lat: puntoA[1] });
  if (direccionA) {
    // Actualizar el input de origen con la dirección
    const originInput = directions.container.querySelector('#mapbox-directions-origin-input input');
    if (originInput) {
      originInput.value = direccionA;
    }
  }

  const closest = obtenerAmbulanciaCercana({ lng: puntoA[0], lat: puntoA[1] }, ambulances);
  setNearestAmbulance(closest);

  // Obtener dirección del punto B (ambulancia)
  const direccionB = await obtenerDireccionDesdeCoordenadas({ lng: closest.lng, lat: closest.lat });
  directions.setDestination([closest.lng, closest.lat]);
  
  if (direccionB) {
    // Actualizar el input de destino con la dirección
    const destInput = directions.container.querySelector('#mapbox-directions-destination-input input');
    if (destInput) {
      destInput.value = direccionB;
    }
  }
});

    setMap(mapInstance);
    // Limpieza previa de hospitales cuando se selecciona una nueva ambulancia
if (hospitalMarkersRef.current.length > 0) {
  hospitalMarkersRef.current.forEach(marker => marker.remove());
  hospitalMarkersRef.current = [];
}

    // ❌ Desactivar el click manual del usuario para definir A o B
mapInstance.on('click', (e) => {
  e.preventDefault();
});


const ambulances = [
  { name: 'A-01', lng: -101.18530, lat: 19.72318 },
  { name: 'A-02', lng: -101.21463, lat: 19.69999 },
  { name: 'A-03', lng: -101.17189, lat: 19.69005 },
];

ambulances.forEach((a) => {
  const el = document.createElement('div');
  el.style.backgroundImage = 'url(/ambulancia.png)';
  el.style.width = '50px';
  el.style.height = '50px';
  el.style.backgroundSize = 'cover';
  el.style.borderRadius = '50%';
  el.style.cursor = 'pointer';

  const markerInstance = new mapboxgl.Marker(el).setLngLat([a.lng, a.lat]).addTo(mapInstance);
  ambulanceMarkersRef.current[a.name] = markerInstance;

  // Click handler — selecciona la ambulancia como Punto A
  
  // Click handler — selecciona la ambulancia como Punto A y muestra hospitales (puntos B)
markerInstance.getElement().addEventListener('click', () => {
  // limpiar estilos de selección antiguos
  Object.values(ambulanceMarkersRef.current).forEach((m) => {
    if (m && m.getElement) {
      m.getElement().style.boxShadow = '';
      m.getElement().style.outline = '';
    }
  });

  // aplicar estilo visual al seleccionado
  const elDom = markerInstance.getElement();
  elDom.style.boxShadow = '0 0 10px 4px rgba(255,0,0,0.4)';
  elDom.style.outline = '2px solid red';

  // Guardar punto A sincronizado con la ambulancia seleccionada
  setPointA({ lng: a.lng, lat: a.lat });
  setNearestAmbulance(a);

  // 🔴 Crear marcadores de hospitales solo si aún no existen
  if (hospitalMarkersRef.current.length === 0) {
    hospitals.forEach((h) => {
      const el = document.createElement('div');
      el.style.backgroundImage = 'url(/hospital.png)';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundSize = 'cover';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';

      const popup = new mapboxgl.Popup({ offset: 25 }).setText(h.name);
      const marker = new mapboxgl.Marker(el)
        .setLngLat([h.lng, h.lat])
        .setPopup(popup)
        .addTo(mapInstance);

      hospitalMarkersRef.current.push(marker);
    });
  }

  // 🔍 Zoom centrado en la ambulancia seleccionada
  mapInstance.flyTo({
    center: [a.lng, a.lat],
    zoom: 14.5,
    speed: 0.8,
    curve: 1.2,
  });

  // Establecer origen automático (punto A) y mostrar ruta inicial
  directions.setOrigin([a.lng, a.lat]);
});


});


    function calcularDistancia(coord1, coord2) {
      const punto1 = new mapboxgl.LngLat(coord1.lng, coord1.lat);
      const punto2 = new mapboxgl.LngLat(coord2.lng, coord2.lat);
      return punto1.distanceTo(punto2);
    }
    

    function obtenerAmbulanciaCercana(puntoA, ambulances) {
      let closest = ambulances[0];
      let shortestDistance = calcularDistancia(puntoA, closest);

      ambulances.forEach((ambulance) => {
        const distance = calcularDistancia(puntoA, ambulance);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          closest = ambulance;
        }
      });

      return closest;
    }

    directions.on('origin', () => {
      const puntoA = directions.getOrigin().geometry.coordinates;
      setOrigin({ lng: puntoA[0], lat: puntoA[1] });

      const closest = obtenerAmbulanciaCercana({ lng: puntoA[0], lat: puntoA[1] }, ambulances);
      setNearestAmbulance(closest);

      directions.setDestination([closest.lng, closest.lat]);
    });

    return () => mapInstance.remove();
  }, []);

  const handleStartMovement = () => {
    if (!map || !origin) return;

// CON ESTE NUEVO BLOQUE:
const startPoint = pointA || (selectedAmbulance || nearestAmbulance);
const destination = selectedHospital || origin;

// SIEMPRE usar el marcador existente - NO crear uno nuevo
let marker = null;
if (selectedAmbulance && ambulanceMarkersRef.current[selectedAmbulance.name]) {
  marker = ambulanceMarkersRef.current[selectedAmbulance.name];
} else if (nearestAmbulance && ambulanceMarkersRef.current[nearestAmbulance.name]) {
  marker = ambulanceMarkersRef.current[nearestAmbulance.name];
}

if (!marker) {
  console.error("No se encontró el marcador de ambulancia");
  return;
}
    
  
    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${startPoint.lng},${startPoint.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
    )
      .then(response => response.json())
      .then(data => {
        const calculatedRoute = data.routes[0].geometry.coordinates;
        const duration = data.routes[0].duration;
        const distance = data.routes[0].distance;
  
        setTime(duration / 60);
        setDistance(distance / 1000);
        setRoute(calculatedRoute);

        ObtenerDatos(duration, distance);

        const LugarAccidente = { lat: startPoint.lat, lng: startPoint.lng }; // Coordenadas del accidente
        const LugarAmbulancia = { lat: nearestAmbulance.lat, lng: nearestAmbulance.lng }; // Coordenadas de la ambulancia

      // Llamadas para obtener ambas direcciones
      obtenerDireccion(LugarAccidente, "accidente").then(() => {
      });

      obtenerDireccion(LugarAmbulancia, "ambulancia").then(() => {
      });
  
        // Actualizar o crear la capa de la ruta en el mapa
        if (map.getSource('route')) {
          map.getSource('route').setData({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: calculatedRoute,
            },
          });
        } else {
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: calculatedRoute,
              },
            },
          });
  
          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#3b9ddd',
              'line-width': 5,
            },
          });
        }
  
        let index = 0;
  
        // Función de interpolación para el movimiento suave
        const interpolate = (start, end, factor) => [
          start[0] + (end[0] - start[0]) * factor,
          start[1] + (end[1] - start[1]) * factor,
        ];
  
        // Función recursiva para mover el marcador a lo largo de la ruta
        const moveMarkerSmoothly = () => {
          if (index < calculatedRoute.length - 1) {
            let factor = 0;
            const interval = setInterval(() => {
              if (factor < 1) {
                const newPos = interpolate(calculatedRoute[index], calculatedRoute[index + 1], factor);
                marker.setLngLat(newPos);
                setPointA({ lng: newPos[0], lat: newPos[1] }); // Mantiene el punto A sincronizado con el movimiento
                factor += 0.02; // Ajusta la velocidad de animación
              } else {
                clearInterval(interval);
                index++;
                moveMarkerSmoothly(); // Mover al siguiente tramo de la ruta
              }
            }, 50);
          } else {
           // Una vez que llega al destino, elimina la capa de ruta y muestra el modal de llegada  
              if (map.getLayer('route')) map.removeLayer('route');
              if (map.getSource('route')) map.removeSource('route'); 
              
              let arrivedAtHospital = false;

              for (let i = 0; i < hospitals.length; i++) {
                  // Compara si las coordenadas coinciden
                  if (destination.lat === hospitals[i].lat && destination.lng === hospitals[i].lng) {
                      setShowArrivalModal(true); 
                      arrivedAtHospital = true; // Marca que la ambulancia llego
                      break; // Termina el ciclo si la ambulancia llegó
                      
                  }
              }
              // Solo muestra el modal si no ha llegado a ningún hospital
              if (!arrivedAtHospital) {
                  setShowModal(true);
              }
              
          }
        };
  
        moveMarkerSmoothly();
      })
      .catch(error => console.error("Error al iniciar el movimiento:", error));
  };
  

  const hospitals = [
    { name: 'Hospital Star Medica', lng: -101.191438, lat: 19.682937 },
    { name: 'IMSS Hospital General Zona 83 Morelia', lng: -101.17451, lat: 19.68219 },
    { name: 'IMSS Hospital General Regional 1 Charo', lng: -101.09293, lat: 19.72438 },
    { name: 'Clínica ISSSTE', lng: -101.18061, lat: 19.72833 },
    { name: 'Hospital Acueducto S.A. de C.V.', lng: -101.172244, lat: 19.697744 },
    { name: 'Hospital Regional Patzcuaro', lng: -101.60626200, lat: 19.51587400 }
  ];

   
  // Método para calcular la distancia entre dos puntos
  const calcularDistancia = (coord1, coord2) => {
    const punto1 = new mapboxgl.LngLat(coord1.lng, coord1.lat);
    const punto2 = new mapboxgl.LngLat(coord2.lng, coord2.lat);
    return punto1.distanceTo(punto2);
  };

  
  // Método para trazar la ruta hacia el hospital (punto C) desde el punto A (origin)
  const traceRouteToHospital = (destination) => {
    if (!map || !origin) {
      console.warn("Mapa o punto de origen (origin) no están definidos.");
      return;
    }
  
    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
    )
      .then(response => response.json())
      .then(data => {
        const calculatedRoute = data.routes[0].geometry.coordinates;
  
        if (map.getSource('hospitalRoute')) {
          map.getSource('hospitalRoute').setData({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: calculatedRoute,
            },
          });
        } else {
          map.addSource('hospitalRoute', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: calculatedRoute,
              },
            },
          });
  
          map.addLayer({
            id: 'hospitalRoute',
            type: 'line',
            source: 'hospitalRoute',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#FF0000',
              'line-width': 5,
            },
          });
        }
      })
      .catch(error => console.error("Error al trazar la ruta hacia el hospital:", error));
  };
  
  // Función para calcular el hospital más cercano y trazar la ruta a este desde el punto A
  /*
  const handleRouteToNearestHospital = () => {
    if (!origin) {
      console.warn("El punto de origen (origin) no está definido.");
      return;
    }
  
    let nearestHospital = hospitals[0];
    let shortestDistance = calcularDistancia(origin, nearestHospital);
  
    hospitals.forEach(hospital => {
      const distance = calcularDistancia(origin, hospital);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestHospital = hospital;
      }
    });
  
    // Trazar la ruta al hospital más cercano desde el punto A (origin)
    traceRouteToHospital(nearestHospital);
  };
  */
 // Función para calcular el hospital más cercano y trazar la ruta a este desde el punto A
const handleRouteToNearestHospital = () => {
  if (!origin) {
    console.warn("El punto de origen (origin) no está definido.");
    return;
  }

  let nearestHospital = hospitals[0];
  let shortestDistance = calcularDistancia(origin, nearestHospital);

  hospitals.forEach(hospital => {
    const distance = calcularDistancia(origin, hospital);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestHospital = hospital;
    }
  });

  // 🔴 ACTUALIZAR: Establecer el hospital más cercano como selectedHospital
  setSelectedHospital(nearestHospital);

  // Trazar la ruta al hospital más cercano desde el punto A (origin)
  traceRouteToHospital(nearestHospital);
};
  
  // Seleccionar un hospital de la lista y trazar la ruta hacia él desde el punto A
  const handleSelectHospital = (hospital) => {
    setSelectedHospital(hospital);
    setShowModal(false);
    setDropdownOpen(false);
  
    // Trazar la ruta al hospital seleccionado desde el punto A (origin)
    traceRouteToHospital(hospital);
  };

   // Función para abrir el modal y el dropdown automáticamente
   const handleOpenModalAndDropdown = () => {
    setShowModal(true);  // Muestra el modal
    setDropdownOpen(true);  // Muestra el dropdown
  };
    // Función para abrir el dropdown y cerrar el modal
    const handleOpenDropdownAndCloseModal = () => {
      setDropdownOpen(true);  // Abre el dropdown
      setShowModal(false);    // Cierra el modal
    };
  
    // Función que maneja la selección de un hospital y cierra el dropdown
    const handleSelectHospitalAndCloseModal = (hospital) => {
      handleSelectHospital(hospital); // Selecciona el hospital
      setShowModal(false); // Cierra el modal
      setDropdownOpen(false); // Cierra el dropdown
    };

// Método para obtener la dirección de una ubicación
  const obtenerDireccion = async (origin, tipoUbicacion) => {
  const { lat, lng } = origin;
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
    );
    if (!response.ok) {
      throw new Error('Error al obtener la dirección');
    }
    const data = await response.json();
    const direccionObtenida = data.features[0]?.place_name || "Dirección no encontrada";

    // Actualizar la dirección en la variable de estado correspondiente
    if (tipoUbicacion === "accidente") {
      setDireccionAccidente(direccionObtenida);
    } else if (tipoUbicacion === "ambulancia") {
      setDireccionAmbulancia(direccionObtenida);
    }
  } catch (error) {
    console.error("Error en la solicitud de geocodificación inversa:", error);
    if (tipoUbicacion === "accidente") {
      setDireccionAccidente("Error al obtener la dirección del accidente");
    } else if (tipoUbicacion === "ambulancia") {
      setDireccionAmbulancia("Error al obtener la dirección de la ambulancia");
    }
  }
};

//console.log("Pruenadeff:",direccion);
const now = new Date();

// Restar un minuto de la hora actual
const horaLlegadaHospital = new Date(now);
horaLlegadaHospital.setMinutes(now.getMinutes() - 1);

// Formatear la hora como HH:mm (formato de 24 horas)
const horaFormateada = horaLlegadaHospital.toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
//const horaAccidente = horaLlegadaHospital.toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });

const horaLlegadaAccidente = new Date(horaLlegadaHospital.getTime() - (t2 * 60000));

// Formatear la hora de llegada al accidente en formato de 12 horas con AM/PM
const horaFormateadaAccidente = horaLlegadaAccidente.toLocaleString("es-MX", {hour: "2-digit", minute: "2-digit", hour12: true});

const formatearTiempoEnMinutos = (tiempoEnMinutos) => {
  //console.log(tiempoEnMinutos);
  const minutos = Math.floor(tiempoEnMinutos); // Parte entera en minutos
  const segundosDecimal = ((tiempoEnMinutos - minutos) * 60) / 100; // Fracción en segundos, convertida a decimal
  return `${(minutos + segundosDecimal).toFixed(2)} minutos`;
};

// Formatear los tiempos t1 y t2
const tiempoFormateadoT1 = formatearTiempoEnMinutos(t1);
const tiempoFormateadoT2 = formatearTiempoEnMinutos(t2);

const calcularTiempoTotalTraslado = (tiempo1, tiempo2) => {
  const tiempoTotal = tiempo1 + tiempo2;
  return tiempoTotal; // Formatear a dos decimales
};

// Calcular el tiempo total de traslado
const tiempoTotalTraslado = calcularTiempoTotalTraslado(t1, t2);
const tiempoTotalFormateado = formatearTiempoEnMinutos (tiempoTotalTraslado);

// Función para calcular la distancia total y formatearla
const calcularDistanciaTotal = (distancia1, distancia2) => {
  const distanciaTotal = distancia1 + distancia2;
  return `${distanciaTotal.toFixed(2)} km`; // Formatear a dos decimales
};

// Calcular la distancia total recorrida
const distanciaTotalRecorrida = calcularDistanciaTotal(d1, d2);

const incrementarContador = () => {
  setContador((prev) => prev + 1);
  return contador + 1; // Devuelve el nuevo valor
};

const distancia = [];
const tiempo = [];

// Método para obtener y almacenar datos
const ObtenerDatos = (newTime, newDistance) => {
  // Almacenar los valores en el arreglo usando el índice actual
  tiempo[contador] = newTime / 60;
  distancia[contador] = newDistance / 1000;

  // Actualizar los valores de los estados
  if (contador === 0) {
    setT1(tiempo[0]);
    setD1(distancia[0]);
  } else if (contador === 1) {
    setT2(tiempo[1]);
    setD2(distancia[1]);
  }
  incrementarContador();
};

  const datosBitacora = {
    numeroAmbulancia: nearestAmbulance ? nearestAmbulance.name : "null",
    horaInicio:tiempoFormateadoT1,
    horaLlegadaAccidente:tiempoFormateadoT2,
    horaLlegadaHospital: horaFormateada, 
    tiempoTotal: tiempoTotalFormateado,
    lugarAccidente: direccionAccidente,
    ubicacionAmbulancia: direccionAmbulancia,
    hospitalDestino: selectedHospital ? selectedHospital.name : "null",
    distanciaRecorrida:distanciaTotalRecorrida,
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '85vh' }}>
      <div id="map" style={{ height: '100%' }} />
  
      {/* Datos del viaje */}
      <div style={{
        position: 'absolute', top: '210px', left: '30px', zIndex: 1,
        backgroundColor: 'white', padding: '15px', borderRadius: '5px',
        maxWidth: '500px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p><strong>Datos del viaje</strong></p>
          <p><strong>Tiempo Estimado: X Minutos</strong></p>
          <p><strong>Distancia Estimada: X Km</strong></p>
        </div>
      </div>
  
      {/* Botón para iniciar recorrido & Hospital mas cercano */}
      <div style={{
        position: 'absolute', bottom: '65px', left: '10px', zIndex: 1,
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        <button onClick={handleStartMovement} style={{
          backgroundColor: '#059FDC', color: 'white', padding: '10px', borderRadius: '5px', width: 'auto',
        }}>
          Iniciar Recorrido
        </button></div>
        
        <div style={{
        position: 'absolute', bottom: '65px', left: '150px', zIndex: 1,
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        <button
            onClick={handleRouteToNearestHospital} style={{
              backgroundColor: '#059FDC', color: 'white', padding: '10px', 
              borderRadius: '5px', width: 'auto',
            }}
          >
            Hospital más cercano
          </button>
      </div>

    {/* Dropdown de hospitales */}
    <div style={{
      position: 'absolute', top: '340px', left: '10px', zIndex: 2, width: '310px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '5px', boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.2)',
    }}>
      <div
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          padding: '5px', backgroundColor: '#059FDC', color: 'white', borderRadius: '5px 5px 5px 5px', cursor: 'pointer', textAlign: 'center',
        }}
      >
        {dropdownOpen ? 'Cerrar Lista de Hospitales' : 'Seleccionar Hospital'}
      </div>
      {dropdownOpen && (
        <div style={{
          maxHeight: '290px', overflowY: 'auto', padding: '10px',
        }}>
          {hospitals.map(hospital => (
            <div key={hospital.name} style={{ marginBottom: '10px' }}>
              <button
                onClick={() => handleSelectHospital(hospital)}
                style={{
                  width: '100%', padding: '2px', backgroundColor: '#f0f0f0', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', textAlign: 'center',
                }}
              >
                {hospital.name}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>

  {/* Modal para seleccionar el hospital */}
  {showModal && (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 2,
  }}>
    <div style={{
      position: 'relative', backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
      maxWidth: '500px', width: '90%', textAlign: 'center',
    }}>
      <button onClick={() => setShowModal(false)} style={{
        position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5em', color: '#555',
      }}>×</button>
      <p><strong>¡La ambulancia llegó al lugar del accidente!</strong></p>

      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%',
      }}>
        <button onClick={handleOpenDropdownAndCloseModal} style={{
          padding: '10px 20px', backgroundColor: '#059FDC', color: 'white',
          border: 'none', borderRadius: '5px', cursor: 'pointer', textAlign: 'center',
        }}>Seleccionar Hospital</button>
      </div>
    </div>
  </div>
)}

  {/* Modal para indicar que la ambulancia ha llegado al hospital */}
  {showArrivalModal && (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 2,
  }}>
    <div style={{
      position: 'relative', backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
      maxWidth: '500px', width: '90%', textAlign: 'center',
    }}>
      <button onClick={() => setShowArrivalModal(false)} style={{
        position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5em', color: '#555',
      }}>×</button>
      <p><strong>¡La ambulancia llegó al hospital!</strong></p>
      <h3>Fin del proceso, el paciente sera atendido por el Hospital: "{selectedHospital.name}"</h3>
      
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%',
      }}>
        <button onClick={() => generarBitacoraPDF(datosBitacora)}  style={{
          padding: '10px 20px', backgroundColor: '#059FDC', color: 'white',
          border: 'none', borderRadius: '50px', cursor: 'pointer', textAlign: 'center',
        }}>Descargar Bitacora</button>
        
        <button onClick={() => window.location.reload()}  style={{
          padding: '10px 20px', backgroundColor: '#059FDC', color: 'white',
          border: 'none', borderRadius: '50px', cursor: 'pointer', textAlign: 'center',
        }}>Finalizar</button>
        

      </div>
    </div>
  </div>
)}
  
    </div>
  );  

  
}

export default App;