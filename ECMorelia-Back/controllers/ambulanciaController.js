const AmbulanciaService = require('../services/ambulanciaService')

class AmbulanciaController {
  constructor() {
    this.ambulanciaService = new AmbulanciaService()
  }

  async addAmbulancia(req, res) {
    try {
      const data = req.body

      const ambulancia = await this.ambulanciaService.addRecord(data)

      res.status(201).send({
        message: `New ambulancia added successfully`,
        ambulancia
      })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async getAllAmbulancias(req, res) {
    try {
      const ambulancias = await this.ambulanciaService.getAllRecords()

      return res.status(200).send(ambulancias)
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async updateAmbulancia(req, res) {
    try {
      const { id } = req.params
      const data = req.body
      await this.ambulanciaService.updateById({ id, data })
      res.status(200).json({ message: 'success update' })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async deleteAmbulancia(req, res) {
    try {
      const { id } = req.params
      await this.ambulanciaService.deleteById(id)
      res.status(200).json({ message: 'success delete' })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }
}

module.exports = AmbulanciaController
