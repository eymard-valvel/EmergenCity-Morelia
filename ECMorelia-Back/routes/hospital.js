const app = require('express')
const router = app.Router()
const HospitalController = require('../controllers/hospitalController')
const hospitalController = new HospitalController()

router.get('/', hospitalController.getAllHospital.bind(hospitalController))

router.post('/', hospitalController.addHospital.bind(hospitalController))

router.put('/:id', hospitalController.updateHosptial.bind(hospitalController))

router.delete('/:id', hospitalController.deleteHospital.bind(hospitalController))

module.exports = router
