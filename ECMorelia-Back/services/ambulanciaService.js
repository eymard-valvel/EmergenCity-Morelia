const prisma = require('../config/prisma')

class AmbulanciaService {
  constructor() {}

  async addRecord(data) {
    try {
      const recordExists = await prisma.ambulancias.findFirst({
        where: {
          numero_placa_sm: data.numero_placa_sm
        }
      })

      if (recordExists) {
        throw new Error('Data already exists')
      }

      return await prisma.ambulancias.create({
        data
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async getAllRecords() {
    try {
      const records = await prisma.ambulancias.findMany({
        select: {
          numero_placa_sm: true,
          modelo: true,
          disponible: true
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
      const recordExists = await prisma.ambulancias.findFirst({
        where: {
          numero_placa_sm: id
        }
      })

      if (!recordExists) {
        throw new Error('Record not exists')
      }

      await prisma.ambulancias.update({
        where: {
          numero_placa_sm: id
        },
        data
      })

      return { message: 'Record modified successfully' }
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async deleteById(id) {
    try {
      const recordExists = await prisma.ambulancias.findFirst({
        where: {
          numero_placa_sm: id
        }
      })

      if (!recordExists) {
        throw new Error('Record not exists')
      }

      await prisma.ambulancias.delete({
        where: {
          numero_placa_sm: id
        }
      })

      return { message: 'Record deleted successfully' }
    } catch (error) {
      throw new Error(error.message)
    }
  }
}

module.exports = AmbulanciaService
