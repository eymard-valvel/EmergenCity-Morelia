import { jsPDF } from "jspdf";

export const generarBitacoraPDF = (datos) => {
  const doc = new jsPDF();

  // Añadir la imagen del logo desde la carpeta public
  const logoUrl = `${window.location.origin}/Logo.png`;
  doc.addImage(logoUrl, "PNG", 10, 10, 30, 30);

  // Título "EMERGENCITY" en letras grandes y azul claro
  doc.setFontSize(20);
  doc.setTextColor(0, 183, 235);  // Color azul claro (RGB)
  doc.text("EMERGENCITY", 50, 25);

  // Subtítulo del PDF
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0); // Volver el color a negro
  doc.text("Bitácora de Traslado", 50, 35);

    // Generar número de traslado y obtener fecha/hora actual
    const numeroTraslado = datos.id || "TR-2024-001";
    const fechaGeneracion = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
    const operador = datos.operador || "Eduardo";
  
    // Agregar datos al PDF
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Número de Traslado: ${numeroTraslado}`, 10, 50);
    doc.text(`Fecha de Generación: ${fechaGeneracion}`, 10, 60);
    doc.text(`Operador: ${operador}`, 10, 70);
  
    // Título de sección "Datos del Traslado"
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text("Datos del Traslado", 10, 90);
  
    // Restaurar tamaño y estilo de fuente para el contenido
    doc.setFontSize(12);
    doc.setFont("Helvetica", "normal");
    doc.text(`Ambulancia: ${datos.numeroAmbulancia}`, 10, 100);
    doc.text(`Tiempo de traslado al Accidente: ${datos.horaInicio}`, 10, 110);
    doc.text(`Tiempo de traslado al Hospital: ${datos.horaLlegadaAccidente }`, 10, 120);
    doc.text(`Tiempo Total de traslado: ${datos.tiempoTotal}`, 10, 130);
    doc.text(`Hora de Llegada al Hospital: ${datos.horaLlegadaHospital}`, 10, 140);
    
  
    // Título de sección "Datos de la Ubicación"
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text("Datos de la Ubicación", 10, 160);
    doc.setFontSize(12);
    doc.setFont("Helvetica", "bold");
    doc.text(`Lugar del Accidente: `, 10, 170);
    doc.setFont("Helvetica", "normal");
    doc.text(`${datos.lugarAccidente }`, 10, 180);
    doc.setFont("Helvetica", "bold");
    doc.text(`Ubicación de la Ambulancia: `, 10, 190);
    doc.setFont("Helvetica", "normal");
    doc.text(`${datos.ubicacionAmbulancia}`, 10, 200);
    doc.setFont("Helvetica", "bold");
    doc.text(`Hospital de Destino: `, 10, 210);
    doc.setFont("Helvetica", "normal");
    doc.text(`${datos.hospitalDestino}`, 10, 220);
    doc.text(`Distancia Total Recorrida: ${datos.distanciaRecorrida}`, 10, 230);

  // Descargar el archivo PDF
  doc.save("bitacora_traslado.pdf");

};
