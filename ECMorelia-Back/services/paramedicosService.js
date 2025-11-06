const prisma = require('../config/prisma')

class ParamedicoService {
  constructor() {}

  async addRecord(data) {
    try {
      const recordExists = await prisma.paramedicos.findFirst({
        where: {
          licencia_medica: data.licencia_medica
        }
      })

      if (recordExists) {
        throw new Error('Data already exists')
      }

      return await prisma.paramedicos.create({
        data
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async getAllRecords() {
    try {
      const records = await prisma.paramedicos.findMany({
        select: {
          nombre: true,
          apellidos: true,
          certificado: true,
          licencia_medica: true,
          licencia_conducir: true
        }
      })

      if (records.length <= 0) {
        return []
      }

      return records
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async updateById({ id, data }) {
    try {
      const recordExists = await prisma.paramedicos.findFirst({
        where: {
          licencia_medica: id
        }
      })

      if (!recordExists) {
        throw new Error('Record not exists')
      }

      await prisma.paramedicos.update({
        where: {
          licencia_medica: id
        },
        data
      })

      return { message: 'Record deleted successfully' }
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async deleteById(id) {
    try {
      const recordExists = await prisma.paramedicos.findFirst({
        where: {
          licencia_medica: id
        }
      })

      if (!recordExists) {
        throw new Error('Record not exists')
      }

      await prisma.paramedicos.delete({
        where: {
          licencia_medica: id
        }
      })

      return { message: 'Record deleted successfully' }
    } catch (error) {
      throw new Error(error.message)
    }
  }
}

module.exports = ParamedicoService
