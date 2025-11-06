const data = require('../config/dataSeed.js')
const SeedService = require('../services/seedService.js')

class SeedController {
  constructor() {
    this.seedService = new SeedService()
  }

  async run(req, res) {
    try {
      await this.seedService.clearTables()
      const doctor = await this.seedService.seedData('doctor', data.doctor)
      const hospitales = await this.seedService.seedData('hospitales', data.hospitales)
      const operador = await this.seedService.seedData('operador', data.operador)
      const paramedico = await this.seedService.seedData('paramedicos', data.paramedico)
      const ambulancias = await this.seedService.seedData('ambulancias', {
        numero_placa_sm: '123456',
        id_paramedicos: paramedico.id_paramedicos,
        id_hospitales: hospitales.id_hospitales,
        modelo: '2024',
        disponible: 'si'
      })
      await this.seedService.seedData('ambulancias_doctor', {
        id_doctor: doctor.id_doctor,
        numero_placa_sm: ambulancias.numero_placa_sm,
        reporte_doctor: 'Atención a paciente en estado crítico.'
      })
      await this.seedService.seedData('ambulancias_hospitales', {
        id_hospitales: hospitales.id_hospitales,
        numero_placa_sm: ambulancias.numero_placa_sm,
        reporte_servicio: 'Servicio de emergencia realizado.'
      })
      await this.seedService.seedData('ambulancias_paramedicos', {
        id_paramedicos: paramedico.id_paramedicos,
        numero_placa_sm: ambulancias.numero_placa_sm,
        reporte_inicial: 'Paciente con dificultad respiratoria.',
        fecha: new Date(),
        estado: 'En servicio'
      })

      res.status(200).json({ seed: 'New data generated' })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }
}

module.exports = SeedController
