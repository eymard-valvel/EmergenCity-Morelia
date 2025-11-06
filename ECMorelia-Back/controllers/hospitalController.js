const HospitalService = require('../services/hospitalService')

class HospitalController {
  constructor() {
    this.hospitalService = new HospitalService()
  }

  async addHospital(req, res) {
    try {
      const data = req.body

      const hospital = await this.hospitalService.addRecord(data)

      res.status(201).send({
        message: `New hospital added successfully`,
        hospital
      })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async getAllHospital(req, res) {
    try {
      const hospital = await this.hospitalService.getAllRecords()

      return res.status(200).send(hospital)
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async updateHosptial(req, res) {
    try {
      const { id } = req.params
      const data = req.body
      await this.hospitalService.updateById({ id, data })
      res.status(200).json({ message: 'success update' })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async deleteHospital(req, res) {
    try {
      const { id } = req.params
      await this.hospitalService.deleteById(id)
      res.status(200).json({ message: 'success delete' })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }
}

module.exports = HospitalController
