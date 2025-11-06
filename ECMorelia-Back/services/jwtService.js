const jwt = require('jsonwebtoken')

class JWTService {
  constructor() {
    this.secret = process.env.SECRET
  }

  generateToken(payload) {
    return jwt.sign(payload, process.env.SECRET, { expiresIn: '1h' })
  }

  verifyToken(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, process.env.SECRET, (err, decoded) => {
        if (err) {
          return reject(new Error('Failed to authenticate token'))
        }
        resolve(decoded)
      })
    })
  }
}

module.exports = JWTService
