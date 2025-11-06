const prisma = require('../config/prisma')

class OperadorService {
  constructor() {}

  async addRecord(data) {
    try {
      const recordExists = await prisma.operador.findFirst({
        where: {
          licencia_medica: data.licencia_medica
        }
      })

      if (recordExists) {
        throw new Error('Data already exists')
      }

      return await prisma.operador.create({
        data
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async getAllRecords() {
    try {
      const records = await prisma.operador.findMany({
        select: {
          id: true,
          nombre: true,
          turno: true,
          licencia_medica: true
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
      const recordExists = await prisma.operador.findFirst({
        where: {
          licencia_medica: id
        }
      })

      if (!recordExists) {
        throw new Error('Record not exists')
      }

      await prisma.operador.update({
        where: {
          licencia_medica: id
        },
        data
      })

      return { message: 'Record updated successfully' }
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async deleteById(id) {
    try {
      const recordExists = await prisma.operador.findFirst({
        where: {
          licencia_medica: id
        }
      })

      if (!recordExists) {
        throw new Error('Record not exists')
      }

      await prisma.operador.delete({
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

module.exports = OperadorService
