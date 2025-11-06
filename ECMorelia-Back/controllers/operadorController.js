const OperadorService = require('../services/operadorService')

class OperadorController {
  constructor() {
    this.operadorService = new OperadorService()
  }

  async addOperador(req, res) {
    try {
      const data = req.body

      const operador = await this.operadorService.addRecord(data)

      res.status(201).send({
        message: `New operador added successfully`,
        operador
      })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async getAllOperador(req, res) {
    try {
      const operador = await this.operadorService.getAllRecords()

      return res.status(200).send(operador)
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async updateOperador(req, res) {
    try {
      const { id } = req.params
      const data = req.body
      await this.operadorService.updateById({ id, data })
      res.status(200).json({ message: 'success update' })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async deleteOperador(req, res) {
    try {
      const { id } = req.params
      await this.operadorService.deleteById(id)
      res.status(200).json({ message: 'success delete' })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }
}

module.exports = OperadorController
