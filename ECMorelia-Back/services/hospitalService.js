const prisma = require('../config/prisma')

class HospitalService {
  constructor() {}

  async addRecord(data) {
    try {
      const recordExists = await prisma.hospitales.findFirst({
        where: {
          id_hospitales: data.id_hospitales
        }
      })

      console.log(recordExists)

      if (recordExists) {
        throw new Error('Data already exists')
      }

      return await prisma.hospitales.create({
        data
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async getAllRecords() {
    try {
      const records = await prisma.hospitales.findMany({
        select: {
          id_hospitales: true,
          nombre: true,
          direccion: true
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

  async getHospitalByName(nombre) {
  try {
    return await prisma.hospitales.findFirst({
      where: { nombre },
      select: {
        id_hospitales: true,
        nombre: true,
        direccion: true
      }
    });
  } catch (error) {
    throw new Error(error.message);
  }
}


  async getHospitalById(id) {
  try {
    const hospital = await prisma.hospitales.findUnique({
      where: {
        id_hospitales: Number(id)
      },
      select: {
        id_hospitales: true,
        nombre: true,
        direccion: true
      }
    });

    if (!hospital) {
      throw new Error("Hospital no encontrado");
    }

    return hospital;

  } catch (error) {
    throw new Error(error.message);
  }
}

  async loginHospital(nombre, password) {
    try {
      const hospital = await prisma.hospitales.findFirst({
        where: {
          nombre,
          password
        },
        select: {
          id_hospitales: true,
          nombre: true,
          direccion: true,
          latitud: true,
          longitud: true
        }
      });

      return hospital ?? null;

    } catch (error) {
      throw new Error(error.message);
    }
  }



  async updateById({ id, data }) {
    try {
      const recordExists = await prisma.hospitales.findFirst({
        where: {
          id_hospitales: Number(id)
        }
      })

      if (!recordExists) {
        throw new Error('Record not exists')
      }

      await prisma.hospitales.update({
        where: {
          id_hospitales: Number(id)
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
      const recordExists = await prisma.hospitales.findFirst({
        where: {
          id_hospitales: Number(id)
        }
      })

      if (!recordExists) {
        throw new Error('Record not exists')
      }

      await prisma.hospitales.delete({
        where: {
          id_hospitales: Number(id)
        }
      })

      return { message: 'Record deleted successfully' }
    } catch (error) {
      throw new Error(error.message)
    }
  }
}

module.exports = HospitalService
