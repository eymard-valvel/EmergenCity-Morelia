const app = require('express')
const router = app.Router()
const AuthController = require('../controllers/authController')
const authController = new AuthController()

router.post('/signup/:role', authController.signup.bind(authController))

router.post('/login/:role', authController.login.bind(authController))

module.exports = router
