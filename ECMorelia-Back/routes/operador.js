const app = require('express')
const router = app.Router()
const OperadorController = require('../controllers/operadorController')
const operadorController = new OperadorController()

router.get('/', operadorController.getAllOperador.bind(operadorController))

router.post('/', operadorController.addOperador.bind(operadorController))

router.put('/:id', operadorController.deleteOperador.bind(operadorController))

router.delete('/:id', operadorController.deleteOperador.bind(operadorController))

module.exports = router
