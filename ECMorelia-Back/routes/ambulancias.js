const app = require('express')
const router = app.Router()
const AmbulanciaController = require('../controllers/ambulanciaController')
const ambulanciaController = new AmbulanciaController()

router.get('/', ambulanciaController.getAllAmbulancias.bind(ambulanciaController))

router.post('/', ambulanciaController.addAmbulancia.bind(ambulanciaController))

router.put('/:id', ambulanciaController.updateAmbulancia.bind(ambulanciaController))

router.delete('/:id', ambulanciaController.deleteAmbulancia.bind(ambulanciaController))

module.exports = router
