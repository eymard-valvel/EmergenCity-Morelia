import { background } from '@chakra-ui/react';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Outlet } from "react-router-dom";

/**
 * ReportePaciente.jsx
 * - Responsive light/dark modes
 * - Sticky "Enviar reporte" bottom button
 * - Intervenciones: agregar / eliminar (lista)
 * - Círculo de triaje con color editable
 * - Mantiene la estructura y la lógica original (WebSocket, submit, form)
 */

const ReportePaciente = () => {

  const [theme, setTheme] = useState('light'); // 'light' | 'dark'
  
  const [seccionActiva, setSeccionActiva] = useState('');
  const [reporte, setReporte] = useState({
    paciente: {
      nombre: '',
      edad: '',
      sexo: '',
      motivo_urgencia: '',
      descripcion_lesion: '',
      tipo_accidente: '',
      lugar: '',
      observaciones: '',
    },
    signos_vitales: {
      frecuencia_cardiaca: '',
      frecuencia_respiratoria: '',
      tension_arterial: '',
      saturacion_oxigeno: '',
      temperatura: '',
      nivel_glucosa: '',
      estado_neurologico: '',
    },
    id_ambulancia: '',
    hora_estimada_llegada: '',
    ubicacion_actual: '',
    condicion_actual: '',
    codigo_prioridad: '',
    descripcion_escena: '',
    otros_hallazgos: '',
    instrucciones_hospital: '',
    intervenciones: [],
  });

  // triage color (rojo por defecto)
  const [triajeColor] = useState('#ff6b6b');
  const [errors, setErrors] = useState({});
  const seccionRefs = {
    identificacion_servicio: useRef(null),
    resumen_inicial: useRef(null),
    signos_vitales: useRef(null),
    intervenciones_realizadas: useRef(null),
    hallazgos_relevantes: useRef(null),
    instrucciones_requeridas: useRef(null),
    codigo_prioridad: useRef(null),
  };

  const [variable, setVariable] = useState(0);
  const aumentarVariable = () => {
    const proximoValor = variable + 1;

    // 3. La condición:
    // Si el próximo valor alcanza o supera el límite...
    if (proximoValor >= 5) {
      setVariable(0); // ...lo reiniciamos a 0.
    } else {
      setVariable(proximoValor); // ...si no, simplemente sumamos 1.
    }
};


  const [socket, setSocket] = useState(null);
  const [mensajeError, setMensajeError] = useState('');
  const [intervencionActual, setIntervencionActual] = useState({
    tipo_intervencion: '',
    descripcion: '',
    hora_intervencion: '',
  });

  useEffect(() => {
    // Apply body background according to theme
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8081');

    ws.onopen = () => {
      console.log('Conectado al servidor de WebSockets');
    };

    ws.onmessage = async (event) => {
      let data;
      if (event.data instanceof Blob) {
        data = await event.data.text();
      } else {
        data = event.data;
      }

      console.log('Mensaje recibido del servidor:', data);

      try {
        const parsedData = JSON.parse(data);
        if (parsedData.tipo === 'navegacion') {
          setSeccionActiva(parsedData.seccion);
        } else if (parsedData.tipo === 'llenado') {
          const keys = Object.keys(parsedData.datos);
          keys.forEach((key) => {
            const path = key.split('.');
            setReporte((prevReporte) => {
              const updatedReporte = { ...prevReporte };
              let current = updatedReporte;
              for (let i = 0; i < path.length - 1; i++) {
                if (!current[path[i]]) current[path[i]] = {};
                current[path[i]] = { ...current[path[i]] };
                current = current[path[i]];
              }
              current[path[path.length - 1]] = parsedData.datos[key];
              return updatedReporte;
            });
          });
        }
      } catch (error) {
        console.error('Error al parsear el mensaje:', error);
        setMensajeError('Error al procesar los datos recibidos.');
      }
    };

    ws.onclose = () => {
      console.log('Desconectado del servidor de WebSockets');
    };

    ws.onerror = (error) => {
      console.error('Error en WebSocket:', error);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (seccionActiva && seccionRefs[seccionActiva] && seccionRefs[seccionActiva].current) {
      seccionRefs[seccionActiva].current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [seccionActiva]);

  const obtenerClaseSeccion = (seccion) =>
    seccionActiva === seccion ? 'seccion-activa' : 'seccion-inactiva';


  const validarFormulario = () => {
  const nuevosErrores = {};
  
  // --- 1. Identificación del Servicio ---
  if (!reporte.id_ambulancia.trim()) nuevosErrores.id_ambulancia = "Campo requerido";
  if (!reporte.hora_estimada_llegada.trim()) nuevosErrores.hora_estimada_llegada = "Campo requerido";
  if (!reporte.ubicacion_actual.trim()) nuevosErrores.ubicacion_actual = "Campo requerido";

  // --- 2. Resumen Inicial del Paciente ---
  // Para objetos anidados, creamos el sub-objeto si no existe
  if (!reporte.paciente.nombre.trim() || !reporte.paciente.edad || !reporte.paciente.sexo) {
    if (!nuevosErrores.paciente) nuevosErrores.paciente = {};
    
    if (!reporte.paciente.nombre.trim()) nuevosErrores.paciente.nombre = "Campo requerido";
    if (!reporte.paciente.edad) nuevosErrores.paciente.edad = "Campo requerido";
    if (!reporte.paciente.sexo) nuevosErrores.paciente.sexo = "Campo requerido";
    // ... (añade el resto de campos de 'paciente' que sean requeridos)
  }

  // --- 3. Signos Vitales ---
  if (!reporte.signos_vitales.frecuencia_cardiaca.trim()) {
    if (!nuevosErrores.signos_vitales) nuevosErrores.signos_vitales = {};
    nuevosErrores.signos_vitales.frecuencia_cardiaca = "Campo requerido";
  }
  // ... (añade el resto de 'signos_vitales')
  
  // ... (AÑADE EL RESTO DE TUS CAMPOS REQUERIDOS AQUÍ) ...

  
  // Actualizamos el estado de errores
  setErrors(nuevosErrores);
  
  // El formulario es válido si el objeto de errores está vacío
  return Object.keys(nuevosErrores).length === 0;
};

  const handleChange = (path, value) => {
    setReporte((prevReporte) => {
      const updatedReporte = { ...prevReporte };
      let current = updatedReporte;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updatedReporte;
    });
  };

  const handleIntervencionChange = (field, value) => {
    setIntervencionActual((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const agregarIntervencion = () => {
    // allow partially empty interventions? original required all fields — we require tipo o descripcion
    if (
      intervencionActual.tipo_intervencion.trim() !== '' ||
      intervencionActual.descripcion.trim() !== ''
    ) {
      setReporte((prevReporte) => ({
        ...prevReporte,
        intervenciones: [
          ...prevReporte.intervenciones,
          {
            ...intervencionActual,
            hora_intervencion: intervencionActual.hora_intervencion || '',
          },
        ],
      }));
      setIntervencionActual({
        tipo_intervencion: '',
        descripcion: '',
        hora_intervencion: '',
      });
    } else {
      alert('Por favor, complete al menos el tipo o la descripción de la intervención.');
    }
  };

  const eliminarIntervencion = (index) => {
    setReporte((prevReporte) => ({
      ...prevReporte,
      intervenciones: prevReporte.intervenciones.filter((_, i) => i !== index),
    }));
  };

  const combinarFechaYHora = (hora) => {
    if (!hora) return '';
    const fechaActual = new Date();
    const [horas, minutos] = hora.split(':');
    fechaActual.setHours(Number.parseInt(horas, 10), Number.parseInt(minutos, 10), 0, 0);
    const tzOffset = fechaActual.getTimezoneOffset() * 60000;
    const fechaLocal = new Date(fechaActual - tzOffset);
    return fechaLocal.toISOString();
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // ==========================================================
    // PASO 1: VALIDAR ANTES DE HACER NADA
    // ==========================================================
    const esValido = validarFormulario();

    // Si el formulario NO es válido, 'validarFormulario' ya actualizó
    // el estado 'errors' y se mostrarán los mensajes.
    // Detenemos el envío aquí.
    if (!esValido) {
      console.log("Formulario inválido. Errores:", errors);
      return;
    }

    // --- Si llegamos aquí, el formulario ES VÁLIDO ---
    
    // Limpiamos errores antiguos (por si acaso)
    setErrors({});

    // Prepara tu objeto 'reporteParaEnviar' (ya lo tenías)
    const reporteParaEnviar = { ...reporte };
    // ... (tu lógica de triajeColor y combinarFechaYHora)
    if (triajeColor) {
       reporteParaEnviar.codigo_prioridad_color = triajeColor;
     }
    if (reporte.hora_estimada_llegada) {
       reporteParaEnviar.hora_estimada_llegada = combinarFechaYHora(reporte.hora_estimada_llegada);
     }
    reporteParaEnviar.intervenciones = reporte.intervenciones.map((intervencion) => {
       // ... (tu lógica de intervenciones)
     });

    // ==========================================================
    // PASO 2: ABRIR EL JSON EN UNA NUEVA PESTAÑA
    // ==========================================================
    const jsonString = JSON.stringify(reporteParaEnviar, null, 2);
    
    const newTab = window.open();
    // Usamos <pre> para que el JSON mantenga el formato
    newTab.document.write('<html><head><title>Reporte JSON</title></head><body><pre>');
    // Usamos textContent para evitar problemas de XSS
    newTab.document.body.firstChild.textContent = jsonString;
    newTab.document.write('</pre></body></html>');
    newTab.document.close();
    
    // ==========================================================
    // PASO 3: TU LÓGICA DE ENVÍO (FETCH) PUEDE CONTINUAR
    // ==========================================================
    try {
      console.log('Reporte a enviar:', jsonString);

      const response = await fetch('http://localhost:3000//reporte-prehospitalario/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString,
      });

      if (response.ok) {
        console.log('Reporte enviado exitosamente');
        alert('Reporte enviado exitosamente');
        // ... (tu lógica de resetear el formulario)
      } else {
        console.error('Error al enviar el reporte');
        //alert('Error al enviar el reporte');
      }
    } catch (error) {
      console.error('Error en la solicitud:', error);
      alert('Error en la solicitud');
    }
  };

  // Small helpers for triage presets
  const triagePresets = [
    { label: 'Crítico (Rojo)', value: '#ff4d4f' },
    { label: 'Urgente (Naranja)', value: '#ff7a45' },
    { label: 'Observación (Amarillo)', value: '#ffd666' },
    { label: 'Estable (Verde)', value: '#52c41a' },
    { label: 'Normal (Azul)', value: '#1890ff' },
  ];

  return (
    <div className={`reporte-root ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      {/* Inline CSS to replicate look & feel quickly */}
      <style>{`
        :root {
          --bg-light: #f5f7f8;
          --panel-light: #ffffff;
          --text-light: #1f2d3d;
          --muted-light: #6b7280;

          --bg-dark: #111418;
          --panel-dark: #1f262a;
          --text-dark: #e6eef6;
          --muted-dark: #9aa7b2;

          --accent: #1d8cf8;
        }
        [data-theme="light"] .reporte-root { background: var(--bg-light); color: var(--text-light); min-height: 100%;}
        [data-theme="dark"] .reporte-root { background: var(--bg-dark); color: var(--text-dark); min-height: 100%;}

        .container {
          max-width: 1100px;
          margin: 24px auto 120px;
          padding: 20px;
          background: var(--panel-light);
          border-radius: 8px;
          box-shadow: 0 6px 18px rgba(16,24,40,0.08);
        }
        [data-theme="dark"] .container {
          background: var(--panel-dark);
          box-shadow: none;
        }

        .header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:16px;
        }
        .brand {
          display:flex;
          gap:12px;
          align-items:center;
        }
        .logo {
          width:36px;height:36px;border-radius:6px;background:linear-gradient(135deg,var(--accent), #0aa);
        }

        .triage {
          display:flex;
          gap:12px;
          align-items:center;
        }

        form.fieldset-list { display:block; gap:18px; }
        fieldset { border: none; padding: 12px 0; }
        legend { font-weight:700; margin-bottom:8px; font-size:1.05rem; }
        label { display:block; font-size:0.9rem; margin-bottom:6px; color: inherit; opacity:0.9; }
        input[type="text"], input[type="number"], input[type="time"], textarea {
          width:100%;
          padding:10px;border-radius:6px;border:1px solid rgba(0,0,0,0.08);
          background: transparent;
          color: inherit;
        }
        [data-theme="dark"] input, [data-theme="dark"] textarea {
          border:1px solid rgba(255,255,255,0.04);
          background: rgba(255,255,255,0.02);
        }
        .grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap:14px; align-items: center;}
        .signs-grid { display:grid; grid-template-columns: repeat(3,1fr); gap:8px; }
        .intervencion-item { padding:12px; border-radius:8px; background: rgba(0,0,0,0.03); border:1px solid rgba(0,0,0,0.04); }
        [data-theme="dark"] .intervencion-item { background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.03); }

        .intervencion-controls { display:flex; gap:8px; align-items:center; margin-top:8px; }
        .btn {
          padding:8px 12px;border-radius:6px;border:none;cursor:pointer;
        }
        .btn-primary { background: #0b86ff; color:white; }
        .btn-danger { background:#ff4d4f;color:white; }
        .icon-btn { background:transparent; border:1px solid rgba(0,0,0,0.06); padding:8px; border-radius:6px; cursor:pointer; }
        [data-theme="dark"] .icon-btn { border:1px solid rgba(255,255,255,0.04); }

        /* Sticky bottom submit */
        .sticky-submit {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.02);
          backdrop-filter: blur(6px);
          padding: 14px 20px;
          display:flex;
          justify-content:center;
          z-index: 60;
        }
        [data-theme="dark"] .sticky-submit { background: rgba(0,0,0,0.6); }

        button{
          width: calc(100% - 20px);
          max-width: 420px;
          padding:12px 22px;
          border-radius: 10px;
          font-weight:700;
          border:none;
          cursor:pointer;
          font-size:1rem;
        }
          
        .boton_triage.light{color:white;}
        .boton_triage.dark{background:#e94b4b;color:white;}

        .sticky-inner {
          width: 100%;
          max-width: 1100px;
          display:flex;
          justify-content:center;
        }
        select{
          border:1px solid rgba(255,255,255,0.04);
          background: rgba(255,255,255,0.02);
        }
        option{
          border:1px solid rgba(255,255,255,0.04);
          background: rgba(255,255,255,0.02);
        }
        .send-button {
          width: calc(100% - 20px);
          max-width: 420px;
          padding:12px 22px;
          border-radius: 10px;
          font-weight:700;
          border:none;
          cursor:pointer;
        }
        .send-button.light { background: #0b86ff; color:white;}
        .send-button.dark { background:#e94b4b; color:white; }

        .triage-circle {
          width:84px; height:84px; border-radius:50%;
          border:4px solid rgba(255,255,255,0.08);
          box-shadow: 0 6px 12px rgba(0,0,0,0.12);
        }

        /* small responsive tweaks */
        @media (max-width:900px){
          .grid-2 { grid-template-columns: 1fr; }
          .signs-grid { grid-template-columns: repeat(2,1fr); }
        }
      `}</style>
      <div className="container" role="main">
        <div className="header">
          <div className="brand">
            <div className="logo" />
            <div>
              <div style={{fontWeight:700}}>Emergencity</div>
              <div style={{fontSize:12, color: 'gray'}}>Reporte prehospitalario</div>
            </div>
          </div>

          {/* Theme toggle and triage */}
          <div style={{display:'flex', gap:16, alignItems:'center'}}>
              <div className="triage">
              <div style={{textAlign:'right', marginRight:8}}>
                <div style={{fontSize:12}}>
                  <button 
                  onClick={aumentarVariable}
                  className={`boton_triage ${theme === 'dark' ? 'dark' : 'light'}`} 
                  style={{background: triagePresets[variable].value, marginRight:20, borderRadius:50, width: 100, height: 100}}
                  >Triage
                  </button>
                </div>
              </div>
              {/* <div className="triage-circle" style={{background: triagePresets[variable].value}} title="Color de triaje" /> */}
              <p>
                {/* Cambia el color del círculo de triaje según la selección */}
                {triagePresets[variable].label}
              </p>
              
              <div>
                {/* <select
                  className='seleccion_de_triage'
                  value={triagePresets.find(p => p.value === triajeColor)?.value || (triagePresets[0].value)}
                >
                  {triagePresets.map(p => (
                    <option key={p.value} value={p.value === 'custom' ? 'custom' : p.value}>
                      {p.label}
                    </option>
                  ))}
                </select> */}
                {/* custom color picker */}
                <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
                  {/* <input
                    placeholder="Código/nota prioridad"
                    value={reporte.codigo_prioridad}
                    onChange={(e) => handleChange(['codigo_prioridad'], e.target.value)}
                    style={{padding:6, borderRadius:6}}
                  /> */}
                </div>
              </div>
            </div>

            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <label style={{fontSize:12}}>Tema</label>
              <button
                onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                className="btn icon-btn"
                aria-label="Toggle theme"
                title="Alternar tema claro/oscuro"
              >
                {theme === 'light' ? '🌙' : '🌤️'}
              </button>
            </div>
          </div>
        </div>

        {mensajeError && (
          <div style={{background:'#ffe5e5', color:'#721c24', padding:12, borderRadius:8, marginBottom:12}}>
            {mensajeError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="fieldset-list" aria-label="Formulario reporte">
          {/* 1. Identificación del Servicio */}
          <fieldset ref={seccionRefs.identificacion_servicio} className={obtenerClaseSeccion('identificacion_servicio')}>
            <legend>1. Identificación del Servicio</legend>
            <div className="grid-2">
              <div>
                <label>Número de ambulancia:</label>
                <input type="text" value={reporte.id_ambulancia} onChange={(e) => handleChange(['id_ambulancia'], e.target.value)} required />
              </div>
              <div>
                <label>Hora estimada de llegada:</label>
                <input type="time" value={reporte.hora_estimada_llegada} onChange={(e) => handleChange(['hora_estimada_llegada'], e.target.value)} required />
              </div>
            </div>
            <div style={{marginTop:8}}>
              <label htmlFor='address'>Ubicación actual:</label>
              <input type="text" value={reporte.ubicacion_actual} onChange={(e) => handleChange(['ubicacion_actual'], e.target.value)} required />
            </div>
          </fieldset>

          {/* 2. Resumen Inicial del Paciente */}
          <fieldset ref={seccionRefs.resumen_inicial} className={obtenerClaseSeccion('resumen_inicial')}>
            <legend>2. Resumen Inicial del Paciente</legend>

            <div className="grid-2">
              <div>
                <label htmlFor='name'>Nombre del paciente:</label>
                <input type="text" value={reporte.paciente.nombre} onChange={(e) => handleChange(['paciente','nombre'], e.target.value)} required />
              </div>
              <div>
                <label htmlFor='age'>Edad:</label>
                <input style={{width: 100}} type="number" value={reporte.paciente.edad} onChange={(e) => handleChange(['paciente','edad'], e.target.value ? Number.parseInt(e.target.value,10) : '')} required />
              </div>
            </div>

            <div style={{display:'flex', gap:12, marginTop:8}}>
              <div>
                <label htmlFor='SEX'>Sexo:</label>
                <div style={{display:'flex', gap:12, marginTop:6}}>
                  <label><input type="radio" name="sexo" value="M" checked={reporte.paciente.sexo === 'M'} onChange={(e) => handleChange(['paciente','sexo'], e.target.value)} /> Masculino</label>
                  <label><input type="radio" name="sexo" value="F" checked={reporte.paciente.sexo === 'F'} onChange={(e) => handleChange(['paciente','sexo'], e.target.value)} /> Femenino</label>
                </div>
              </div>

              <div style={{flex:1}}>
                <label htmlFor='reasonfor'>Motivo de urgencia:</label>
                <textarea value={reporte.paciente.motivo_urgencia} onChange={(e) => handleChange(['paciente','motivo_urgencia'], e.target.value)} />
              </div>
            </div>

            <div style={{marginTop:8}}>
              <label>Descripción de la lesión:</label>
              <textarea value={reporte.paciente.descripcion_lesion} onChange={(e) => handleChange(['paciente','descripcion_lesion'], e.target.value)} />
            </div>

            <div className="grid-2" style={{marginTop:8}}>
              <div>
                <label>Lugar donde se encontró al paciente:</label>
                <input type="text" value={reporte.paciente.lugar} onChange={(e) => handleChange(['paciente','lugar'], e.target.value)} />
              </div>
              <div>
                <label>Tipo de accidente:</label>
                <input type="text" value={reporte.paciente.tipo_accidente} onChange={(e) => handleChange(['paciente','tipo_accidente'], e.target.value)} />
              </div>
            </div>

            <div style={{marginTop:8}}>
              <label>Observaciones adicionales:</label>
              <textarea value={reporte.paciente.observaciones} onChange={(e) => handleChange(['paciente','observaciones'], e.target.value)} />
            </div>
          </fieldset>

          {/* 3. Signos Vitales */}
          <fieldset ref={seccionRefs.signos_vitales} className={obtenerClaseSeccion('signos_vitales')}>
            <legend>3. Signos Vitales Iniciales y Monitoreo</legend>
            <div className="signs-grid" style={{marginBottom:8}}>
              <div>
                <label>Frecuencia cardíaca (FC)</label>
                <input value={reporte.signos_vitales.frecuencia_cardiaca} onChange={(e) => handleChange(['signos_vitales','frecuencia_cardiaca'], e.target.value)} />
              </div>
              <div>
                <label>Frecuencia respiratoria (FR)</label>
                <input value={reporte.signos_vitales.frecuencia_respiratoria} onChange={(e) => handleChange(['signos_vitales','frecuencia_respiratoria'], e.target.value)} />
              </div>
              <div>
                <label>Presión arterial (TA)</label>
                <input value={reporte.signos_vitales.tension_arterial} onChange={(e) => handleChange(['signos_vitales','tension_arterial'], e.target.value)} />
              </div>

              <div>
                <label>SpO₂</label>
                <input value={reporte.signos_vitales.saturacion_oxigeno} onChange={(e) => handleChange(['signos_vitales','saturacion_oxigeno'], e.target.value)} />
              </div>
              <div>
                <label>Temperatura</label>
                <input value={reporte.signos_vitales.temperatura} onChange={(e) => handleChange(['signos_vitales','temperatura'], e.target.value)} />
              </div>
              <div>
                <label>Nivel de glucosa</label>
                <input value={reporte.signos_vitales.nivel_glucosa} onChange={(e) => handleChange(['signos_vitales','nivel_glucosa'], e.target.value)} />
              </div>
            </div>

            <div>
              <label>Estado neurológico</label>
              <textarea value={reporte.signos_vitales.estado_neurologico} onChange={(e) => handleChange(['signos_vitales','estado_neurologico'], e.target.value)} />
            </div>
          </fieldset>

          {/* 4. Intervenciones Realizadas */}
          <fieldset ref={seccionRefs.intervenciones_realizadas} className={obtenerClaseSeccion('intervenciones_realizadas')}>
            <legend>4. Intervenciones Realizadas</legend>

            {/* Listado de intervenciones agregadas */}
            {reporte.intervenciones.length === 0 && <div style={{color:'gray'}}>No hay intervenciones registradas.</div>}
            {reporte.intervenciones.map((iv, idx) => (
              <div key={idx} className="intervencion-item" style={{marginBottom:10}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700}}>Intervención {idx + 1}</div>
                    <div style={{fontSize:13, color:'gray'}}>
                      {iv.tipo_intervencion || '—'} {iv.hora_intervencion ? ` · ${iv.hora_intervencion}` : ''}
                    </div>
                  </div>
                  <div style={{display:'flex', gap:8}}>
                    <button type="button" className="icon-btn" onClick={() => eliminarIntervencion(idx)} title="Eliminar" style={{width:39}}>
                      🗑️
                    </button>
                  </div>
                </div>
                <div style={{marginTop:8}}>{iv.descripcion || <i style={{color:'gray'}}>Sin descripción</i>}</div>
              </div>
            ))}

            {/* Panel para agregar nueva intervención */}
            <div style={{marginTop:12, padding:12, borderRadius:8, border:'1px dashed rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <div style={{fontWeight:700}}>Agregar Intervención</div>
                <div style={{display:'flex', gap:8}}>
                  <button type="button" className="icon-btn" onClick={agregarIntervencion} title="Agregar" style={{width:39}}>
                    ➕
                  </button>
                </div>
              </div>

              <div style={{display:'grid', gap:8}}>
                <label htmlFor='intervention'>Tipo de intervención</label>
                <input value={intervencionActual.tipo_intervencion} onChange={(e) => handleIntervencionChange('tipo_intervencion', e.target.value)} placeholder="Ej. Oxigenoterapia" />

                <label htmlFor='desc'>Descripción</label>
                <textarea value={intervencionActual.descripcion} onChange={(e) => handleIntervencionChange('descripcion', e.target.value)} placeholder="Detalles..." />

                <label htmlFor='hour'>Hora de intervención</label>
                <input type="time" value={intervencionActual.hora_intervencion} onChange={(e) => handleIntervencionChange('hora_intervencion', e.target.value)} />
              </div>
            </div>
          </fieldset>

          {/* 5. Hallazgos Relevantes */}
          <fieldset ref={seccionRefs.hallazgos_relevantes} className={obtenerClaseSeccion('hallazgos_relevantes')}>
            <legend>5. Hallazgos Relevantes</legend>
            <label>Descripción de la escena</label>
            <textarea value={reporte.descripcion_escena} onChange={(e) => handleChange(['descripcion_escena'], e.target.value)} />

            <label style={{marginTop:8}}>Otros hallazgos</label>
            <textarea value={reporte.otros_hallazgos} onChange={(e) => handleChange(['otros_hallazgos'], e.target.value)} />
          </fieldset>

          {/* 6. Instrucciones Requeridas */}
          <fieldset ref={seccionRefs.instrucciones_requeridas} className={obtenerClaseSeccion('instrucciones_requeridas')}>
            <legend>6. Instrucciones Requeridas</legend>
            <label>Sugerencias para el hospital</label>
            <textarea value={reporte.instrucciones_hospital} onChange={(e) => handleChange(['instrucciones_hospital'], e.target.value)} />
          </fieldset>

          {/* 7. Código de Prioridad */}
          {/* <fieldset ref={seccionRefs.codigo_prioridad} className={obtenerClaseSeccion('codigo_prioridad')}>
            <legend>7. Código de Prioridad</legend>
            <label>Código de prioridad</label>
            <input value={reporte.codigo_prioridad} onChange={(e) => handleChange(['codigo_prioridad'], e.target.value)} />
            <label style={{marginTop:8}}>Condición actual</label>
            <textarea value={reporte.condicion_actual} onChange={(e) => handleChange(['condicion_actual'], e.target.value)} />
          </fieldset> */}
        </form>

        {/* Outlet si usas rutas secundarias */}
        <Outlet />
      </div>

      {/* Sticky submit area */}
      <div className="sticky-submit" role="contentinfo">
        <div className="sticky-inner">
          <button
            onClick={handleSubmit}
            className={`send-button ${theme === 'dark' ? 'dark' : 'light'}`}
            aria-label="Enviar reporte"
          >
            Enviar reporte
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportePaciente;
