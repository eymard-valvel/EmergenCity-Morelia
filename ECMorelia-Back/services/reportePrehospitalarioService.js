const prisma = require('../config/prisma');

class ReportePrehospitalarioService {
  constructor() {}

  async addRecord(data) {
    try {
      // Crear el paciente
      const paciente = await prisma.paciente.create({
        data: {
          nombre: data.paciente.nombre,
          edad: data.paciente.edad,
          sexo: data.paciente.sexo,
          motivo_urgencia: data.paciente.motivo_urgencia,
          descripcion_lesion: data.paciente.descripcion_lesion,
          tipo_accidente: data.paciente.tipo_accidente,
          lugar: data.paciente.lugar,
          observaciones: data.paciente.observaciones,
        }
      });

      // Crear los signos vitales asociados al paciente
      const signosVitales = await prisma.signosVitales.create({
        data: {
          frecuencia_cardiaca: data.signos_vitales.frecuencia_cardiaca,
          frecuencia_respiratoria: data.signos_vitales.frecuencia_respiratoria,
          tension_arterial: data.signos_vitales.tension_arterial,
          saturacion_oxigeno: data.signos_vitales.saturacion_oxigeno,
          temperatura: data.signos_vitales.temperatura,
          nivel_glucosa: data.signos_vitales.nivel_glucosa,
          estado_neurologico: data.signos_vitales.estado_neurologico,
          paciente: {
            connect: {
              id_paciente: paciente.id_paciente
            }
          }
        }
      });

      
      if (!paciente) {
        throw new Error('Paciente no existe');
      }
      

      // Verificar que la ambulancia existe
const ambulancia = await prisma.ambulancias.findUnique({
  where: {
    numero_placa_sm: data.id_ambulancia
  }
});

if (!ambulancia) {
  throw new Error('Ambulancia no existe');
}



      // Crear el reporte prehospitalario asociado al paciente y la ambulancia
      const reporte = await prisma.reportePrehospitalario.create({
        data: {
          id_paciente: paciente.id_paciente,
          id_ambulancia: data.id_ambulancia,
          hora_estimada_llegada: data.hora_estimada_llegada,
          ubicacion_actual: data.ubicacion_actual,
          condicion_actual: data.condicion_actual,
          codigo_prioridad: data.codigo_prioridad,
          descripcion_escena: data.descripcion_escena,
          otros_hallazgos: data.otros_hallazgos,
          instrucciones_hospital: data.instrucciones_hospital,
          intervenciones: data.intervenciones ? {
            create: data.intervenciones.map(intervencion => ({
              tipo_intervencion: intervencion.tipo_intervencion,
              descripcion: intervencion.descripcion,
              hora_intervencion: intervencion.hora_intervencion,
            })),
          } : undefined,
          id_signos: signosVitales.id_signos
        },
        include: {
          paciente: true,
          ambulancia: true,
          intervenciones: true,
          signos_vitales: true,
        }
      });

      return reporte;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAllRecords() {
    try {
      return await prisma.reportePrehospitalario.findMany({
        include: {
          paciente: true,
          ambulancia: true,
          intervenciones: true,
          signos_vitales: true,
        },
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getRecordById(id) {
    try {
      return await prisma.reportePrehospitalario.findUnique({
        where: { id_reporte: parseInt(id) },
        include: {
          paciente: true,
          ambulancia: true,
          intervenciones: true,
          signos_vitales: true,
        },
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateById({ id, data }) {
    try {
      const recordExists = await prisma.reportePrehospitalario.findUnique({
        where: { id_reporte: parseInt(id) },
      });

      if (!recordExists) {
        throw new Error('Record not exists');
      }

      return await prisma.reportePrehospitalario.update({
        where: { id_reporte: parseInt(id) },
        data,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async deleteById(id) {
    try {
      const recordExists = await prisma.reportePrehospitalario.findUnique({
        where: { id_reporte: parseInt(id) },
      });

      if (!recordExists) {
        throw new Error('Record not exists');
      }

      await prisma.reportePrehospitalario.delete({
        where: { id_reporte: parseInt(id) },
      });

      return { message: 'Record deleted successfully' };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = ReportePrehospitalarioService;
