const prisma = require('../config/prisma')

class SeedService {
  constructor() {}

  async clearTables() {
    await prisma.ambulancias_paramedicos.deleteMany()
    await prisma.ambulancias_hospitales.deleteMany()
    await prisma.ambulancias_doctor.deleteMany()
    await prisma.ambulancias.deleteMany()
    await prisma.paramedicos.deleteMany()
    await prisma.operador.deleteMany()
    await prisma.hospitales.deleteMany()
    await prisma.doctor.deleteMany()
  }

  async seedData(table, data) {
    try {
      return await prisma[table].create({
        data
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }
}

module.exports = SeedService
