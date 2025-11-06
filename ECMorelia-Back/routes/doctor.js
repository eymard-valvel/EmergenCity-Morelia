const app = require('express')
const router = app.Router()
const DoctorController = require('../controllers/doctorController')
const doctorController = new DoctorController()

router.get('/', doctorController.getAllDoctor.bind(doctorController))

router.post('/', doctorController.addDoctor.bind(doctorController))

router.put('/:id', doctorController.updateDoctor.bind(doctorController))

router.delete('/:id', doctorController.deleteDoctor.bind(doctorController))

module.exports = router
