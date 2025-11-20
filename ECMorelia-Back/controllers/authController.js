const UserService = require('../services/userService')

class AuthController {
  constructor() {
    this.userService = new UserService()
  }

  async signup(req, res) {
    try {
      const { role } = req.params
      const user = req.body

      const signupByRole = {
        operador: async () => await this.userService.addUser(user, role, 'licencia_medica'),
        paramedicos: async () => await this.userService.addUser(user, role, 'licencia_medica'),
        doctor: async () => await this.userService.addUser(user, role, 'licencia_medica'),
hospitales: async () => await this.userService.addUser(user, role, 'nombre')
      }

      if (!signupByRole[role]) {
        return res.status(400).send({ message: 'Role not supported' })
      }

      const newUser = await signupByRole[role]()

      res.status(201).send({
        message: `New ${role} added successfully`,
        ...newUser
      })
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }

  async login(req, res) {
    try {
      const { role } = req.params
      const user = req.body

      const loginByRole = {
        operador: async () => await this.userService.verifyUser(user, role, 'licencia_medica'),
        paramedicos: async () => await this.userService.verifyUser(user, role, 'licencia_medica'),
        doctor: async () => await this.userService.verifyUser(user, role, 'licencia_medica'),
hospitales: async () => await this.userService.verifyHospital(user)
      }

      if (!loginByRole[role]) {
        return res.status(404).send({ message: 'Role not supported' })
      }

      const result = await loginByRole[role]()

// Login normal (operador, doctor, paramédico)
if (role !== 'hospitales') {
  return res
    .cookie('token', result, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000,
      sameSite: 'Strict'
    })
    .status(200)
    .send({ message: 'Login successful', role })
}

// Login para hospitales
return res.status(200).send({
  message: 'Login successful',
  role,
  id_hospitales: result.id_hospitales,
  nombre: result.nombre,
  direccion: result.direccion,
  latitud: result.latitud,
  longitud: result.longitud
})

    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }
}

module.exports = AuthController
