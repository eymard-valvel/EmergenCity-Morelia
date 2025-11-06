const DoctorService = require('../services/doctorService')

class DoctorController {
  constructor() {
    this.doctorService = new DoctorService()
  }

  async addDoctor(req, res) {
    try {
      const data = req.body

      const doctor = await this.doctorService.addRecord(data)

      res.status(201).send({
        message: `New doctor added successfully`,
        doctor
      })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async getAllDoctor(req, res) {
    try {
      const doctor = await this.doctorService.getAllRecords()

      return res.status(200).send(doctor)
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async updateDoctor(req, res) {
    try {
      const { id } = req.params
      const data = req.body
      await this.doctorService.updateById({ id, data })
      res.status(200).json({ message: 'success update' })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async deleteDoctor(req, res) {
    try {
      const { id } = req.params
      await this.doctorService.deleteById(id)
      res.status(200).json({ message: 'success delete' })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }
}

module.exports = DoctorController
