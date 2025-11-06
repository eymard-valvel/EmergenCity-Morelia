const BcryptService = require('./bcryptService')
const prisma = require('../config/prisma')
const JWTService = require('./jwtService')

class OperadorService {
  constructor() {
    this.bcryptService = new BcryptService()
    this.jwtService = new JWTService()
  }

  async addUser(user, role, id) {
    try {
      const userExists = await prisma[role].findFirst({
        where: {
          [id]: user[id]
        }
      })

      if (userExists) {
        throw new Error('User already exists')
      }

      const hashedPassword = await this.bcryptService.hashPassword(user.password)
      const createdUser = await prisma[role].create({
        data: {
          ...user,
          password: hashedPassword
        }
      })

      return { user: { ...createdUser } }
    } catch (error) {
      throw new Error(error.message)
    }
  }

async verifyUser(user, rol, id) {
    try {
        const currentUser = await prisma[rol].findFirst({
            where: { [id]: user[id] }
        })

        if (!currentUser) {
            throw new Error('User not found')
        }

        const isPasswordValid = await this.bcryptService.comparePassword(
            user.password,
            currentUser.password
        )
        if (!isPasswordValid) {
            throw new Error('Invalid credentials')
        }

        // SOLUCIÓN: Usar el campo correcto para cada rol
        let tokenPayload;
        if (rol === 'hospitales') {
            tokenPayload = { sub: currentUser.nombre }; // Para hospitales usa 'nombre'
        } else {
            tokenPayload = { sub: currentUser.licencia_medica }; // Para otros usa 'licencia_medica'
        }

        return this.jwtService.generateToken(tokenPayload)
    } catch (error) {
        throw new Error(error.message)
    }
}
  
/*
  async verifyUser(user, rol, id) {
    try {
      const currentUser = await prisma[rol].findUnique({
        where: { [id]: user[id] }
      })

      if (!currentUser) {
        throw new Error('User not found')
      }

      const isPasswordValid = await this.bcryptService.comparePassword(
        user.password,
        currentUser.password
      )
      if (!isPasswordValid) {
        throw new Error('Invalid credentials')
      }

      return this.jwtService.generateToken({ sub: currentUser.licencia_medica })
    } catch (error) {
      throw new Error(error.message)
    }
  }
  */
}

module.exports = OperadorService
