const JwtService = require('../services/jwtService')

class AuthMiddleware {
  constructor() {
    this.jwtService = new JwtService()
  }

  verify() {
    return async (req, res, next) => {
      try {
        const token = req.cookies['token']

        if (!token) {
          return res.status(401).json({ message: 'No token provided' })
        }

        const decoded = await this.jwtService.verifyToken(token)

        req.user = decoded
        next()
      } catch (error) {
        return res.status(403).json({ message: error.message })
      }
    }
  }
}

module.exports = AuthMiddleware
