const app = require('express')
const router = app.Router()
const ParamedicoController = require('../controllers/paramedicoController')
const paramedicoController = new ParamedicoController()

router.get('/', paramedicoController.getAllParamedico.bind(paramedicoController))

router.post('/', paramedicoController.addParamedico.bind(paramedicoController))

router.put('/:id', paramedicoController.updateParamedico.bind(paramedicoController))

router.delete('/:id', paramedicoController.deleteParamedico.bind(paramedicoController))

module.exports = router
