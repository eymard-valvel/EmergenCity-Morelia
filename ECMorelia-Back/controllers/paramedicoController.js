const ParamedicoService = require('../services/paramedicosService')

class ParamedicoController {
  constructor() {
    this.paramedicoService = new ParamedicoService()
  }

  async addParamedico(req, res) {
    try {
      const data = req.body

      const paramedico = await this.paramedicoService.addRecord(data)

      res.status(201).send({
        message: `New paramedico added successfully`,
        paramedico
      })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async getAllParamedico(req, res) {
    try {
      const paramedico = await this.paramedicoService.getAllRecords()

      return res.status(200).send(paramedico)
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async updateParamedico(req, res) {
    try {
      const { id } = req.params
      const data = req.body
      await this.paramedicoService.updateById({ id, data })
      res.status(200).json({ message: 'success update' })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async deleteParamedico(req, res) {
    try {
      const { id } = req.params
      await this.paramedicoService.deleteById(id)
      res.status(200).json({ message: 'success delete' })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }
}

module.exports = ParamedicoController
