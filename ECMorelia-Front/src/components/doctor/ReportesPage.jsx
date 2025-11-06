// src/components/doctor/ReportesPage.jsx

import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ReportesPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all reports when the component mounts
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('http://localhost:3000/reporte-prehospitalario/');
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setReports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  /**
   * Función para agregar encabezado en cada página
   * @param {Object} doc - Instancia de jsPDF
   * @param {number} pageNumber - Número de página actual
   */
  const addHeader = (doc, pageNumber) => {
    doc.setFontSize(12);
    doc.text('Reporte Prehospitalario', doc.internal.pageSize.getWidth() / 2, 15, {
      align: 'center',
    });
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 15);
    doc.text(`Página ${pageNumber}`, doc.internal.pageSize.getWidth() - 20, 15);
    doc.setLineWidth(0.5);
    doc.line(14, 18, doc.internal.pageSize.getWidth() - 14, 18);
  };

  /**
   * Función para agregar pie de página en cada página
   * @param {Object} doc - Instancia de jsPDF
   */
  const addFooter = (doc) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 15, doc.internal.pageSize.getWidth() - 14, pageHeight - 15);
    doc.setFontSize(10);
    doc.text(
      'Documento confidencial - Uso exclusivo del personal médico',
      doc.internal.pageSize.getWidth() / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  };

  /**
   * Función para generar y descargar el PDF de un reporte específico
   * @param {number} id_reporte - ID único del reporte
   */
  const generarPDF = async (id_reporte) => {
    try {
      // Obtener los detalles completos del reporte
      const response = await fetch(
        `http://localhost:3000/reporte-prehospitalario/${id_reporte}`
      );
      if (!response.ok) {
        throw new Error(
          `Error al obtener los detalles: ${response.status} ${response.statusText}`
        );
      }
      const reporte = await response.json();

      // Crear una nueva instancia de jsPDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 14;
      const marginRight = 14;
      const maxLineWidth = pageWidth - marginLeft - marginRight;
      let positionY = 25; // Iniciar después del encabezado
      let pageNumber = 1;

      // Función para verificar si se necesita una nueva página
      const checkPageHeight = (additionalSpace = 0) => {
        if (positionY + additionalSpace > pageHeight - 20) {
          addFooter(doc);
          doc.addPage();
          pageNumber += 1;
          addHeader(doc, pageNumber);
          positionY = 25; // Reiniciar posición Y después del encabezado
        }
      };

      // Añadir encabezado inicial
      addHeader(doc, pageNumber);

      // Función para agregar texto con ajuste automático y manejo de saltos de línea
      const addWrappedText = (text, x, y) => {
        const textLines = doc.splitTextToSize(text, maxLineWidth);
        for (let i = 0; i < textLines.length; i++) {
          checkPageHeight(7);
          doc.text(textLines[i], x, positionY);
          positionY += 7;
        }
      };

      // Información General del Reporte
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Información General', marginLeft, positionY);
      positionY += 6;
      doc.setLineWidth(0.1);
      doc.line(marginLeft, positionY, pageWidth - marginRight, positionY);
      positionY += 4;

      doc.setFont('helvetica', 'normal');
      const generalInfo = [
        `ID Reporte: ${reporte.id_reporte}`,
        `ID Ambulancia: ${reporte.id_ambulancia}`,
        `Código de Prioridad: ${reporte.codigo_prioridad}`,
        `Hora Estimada de Llegada: ${new Date(reporte.hora_estimada_llegada).toLocaleString()}`,
        `Ubicación Actual: ${reporte.ubicacion_actual}`,
        `Condición Actual: ${reporte.condicion_actual}`,
        `Descripción de la Escena: ${reporte.descripcion_escena}`,
        `Otros Hallazgos: ${reporte.otros_hallazgos}`,
        `Instrucciones al Hospital: ${reporte.instrucciones_hospital}`,
      ];

      generalInfo.forEach((text) => {
        addWrappedText(text, marginLeft, positionY);
      });

      // Información del Paciente
      checkPageHeight(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Información del Paciente', marginLeft, positionY);
      positionY += 6;
      doc.setLineWidth(0.1);
      doc.line(marginLeft, positionY, pageWidth - marginRight, positionY);
      positionY += 4;

      doc.setFont('helvetica', 'normal');
      const patientInfo = [
        `Nombre: ${reporte.paciente.nombre}`,
        `Edad: ${reporte.paciente.edad} años`,
        `Sexo: ${reporte.paciente.sexo}`,
        `Motivo de Urgencia: ${reporte.paciente.motivo_urgencia}`,
        `Descripción de Lesión: ${reporte.paciente.descripcion_lesion}`,
        `Tipo de Accidente: ${reporte.paciente.tipo_accidente}`,
        `Lugar: ${reporte.paciente.lugar}`,
        `Observaciones: ${reporte.paciente.observaciones}`,
      ];

      patientInfo.forEach((text) => {
        addWrappedText(text, marginLeft, positionY);
      });

      // Información de la Ambulancia
      checkPageHeight(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Información de la Ambulancia', marginLeft, positionY);
      positionY += 6;
      doc.setLineWidth(0.1);
      doc.line(marginLeft, positionY, pageWidth - marginRight, positionY);
      positionY += 4;

      doc.setFont('helvetica', 'normal');
      const ambulanceInfo = [
        `Número de Placa SM: ${reporte.ambulancia.numero_placa_sm}`,
        `Modelo: ${reporte.ambulancia.modelo}`,
        `Disponible: ${reporte.ambulancia.disponible ? 'Sí' : 'No'}`,
      ];

      ambulanceInfo.forEach((text) => {
        addWrappedText(text, marginLeft, positionY);
      });

      // Signos Vitales
      checkPageHeight(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Signos Vitales', marginLeft, positionY);
      positionY += 6;
      doc.setLineWidth(0.1);
      doc.line(marginLeft, positionY, pageWidth - marginRight, positionY);
      positionY += 4;

      doc.setFont('helvetica', 'normal');
      const vitalSigns = [
        `Frecuencia Cardiaca: ${reporte.signos_vitales.frecuencia_cardiaca} bpm`,
        `Frecuencia Respiratoria: ${reporte.signos_vitales.frecuencia_respiratoria} rpm`,
        `Tensión Arterial: ${reporte.signos_vitales.tension_arterial} mmHg`,
        `Saturación de Oxígeno: ${reporte.signos_vitales.saturacion_oxigeno}%`,
        `Temperatura: ${reporte.signos_vitales.temperatura} °C`,
        `Nivel de Glucosa: ${reporte.signos_vitales.nivel_glucosa} mg/dL`,
        `Estado Neurológico: ${reporte.signos_vitales.estado_neurologico}`,
      ];

      vitalSigns.forEach((text) => {
        addWrappedText(text, marginLeft, positionY);
      });

      // Intervenciones
      if (reporte.intervenciones && reporte.intervenciones.length > 0) {
        checkPageHeight(15);
        doc.setFont('helvetica', 'bold');
        doc.text('Intervenciones', marginLeft, positionY);
        positionY += 6;
        doc.setLineWidth(0.1);
        doc.line(marginLeft, positionY, pageWidth - marginRight, positionY);
        positionY += 4;

        const tableColumn = [
          { title: 'Tipo de Intervención', dataKey: 'tipo_intervencion' },
          { title: 'Descripción', dataKey: 'descripcion' },
          { title: 'Hora de Intervención', dataKey: 'hora_intervencion' },
        ];

        const tableRows = reporte.intervenciones.map((intervencion) => ({
          tipo_intervencion: intervencion.tipo_intervencion,
          descripcion: intervencion.descripcion,
          hora_intervencion: new Date(intervencion.hora_intervencion).toLocaleString(),
        }));

        doc.autoTable({
          columns: tableColumn,
          body: tableRows,
          startY: positionY,
          margin: { left: marginLeft, right: marginRight },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          theme: 'grid',
          didDrawPage: (data) => {
            positionY = data.cursor.y + 10;
          },
          willDrawCell: (data) => {
            // Verificar si se necesita una nueva página antes de dibujar cada celda
            checkPageHeight(data.cell.height);
          },
        });
      }

      // Añadir pie de página a la última página
      addFooter(doc);

      // Guardar el PDF con un nombre descriptivo
      doc.save(`Reporte_${reporte.id_reporte}.pdf`);
    } catch (err) {
      console.error(err);
    }
  };

  // Manejo de estados de carga y errores
  if (loading) {
    return <div className="p-4">Cargando reportes...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (reports.length === 0) {
    return <div className="p-4">No hay reportes disponibles.</div>;
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">Lista de Reportes Prehospitalarios</h1>
      <table className="min-w-full bg-white dark:bg-gray-700">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">ID Ambulancia</th>
            <th className="py-2 px-4 border-b">Paciente</th>
            <th className="py-2 px-4 border-b">Edad</th>
            <th className="py-2 px-4 border-b">Sexo</th>
            <th className="py-2 px-4 border-b">Motivo de Urgencia</th>
            <th className="py-2 px-4 border-b">Código de Prioridad</th>
            <th className="py-2 px-4 border-b">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id_reporte} className="hover:bg-gray-100 dark:hover:bg-gray-600">
              <td className="py-2 px-4 border-b">{report.id_ambulancia}</td>
              <td className="py-2 px-4 border-b">{report.paciente.nombre}</td>
              <td className="py-2 px-4 border-b">{report.paciente.edad}</td>
              <td className="py-2 px-4 border-b">{report.paciente.sexo}</td>
              <td className="py-2 px-4 border-b">{report.paciente.motivo_urgencia}</td>
              <td className="py-2 px-4 border-b">{report.codigo_prioridad}</td>
              <td className="py-2 px-4 border-b">
                <button
                  onClick={() => generarPDF(report.id_reporte)}
                  className="text-blue-500 hover:underline"
                >
                  Ver Detalles (PDF)
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportesPage;
