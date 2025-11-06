const bcrypt = require('bcrypt')

class BcryptService {
  async hashPassword(password) {
    const saltRounds = 10
    return await bcrypt.hash(password, saltRounds)
  }

  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword)
  }
}

module.exports = BcryptService
