const app = require('express')
const router = app.Router()
const HospitalController = require('../controllers/hospitalController')
const hospitalController = new HospitalController()

router.get('/', hospitalController.getAllHospital.bind(hospitalController))

router.post('/', hospitalController.addHospital.bind(hospitalController))

router.put('/:id', hospitalController.updateHosptial.bind(hospitalController))

router.delete('/:id', hospitalController.deleteHospital.bind(hospitalController))

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await hospitalController.hospitalService.getHospitalById(id);

    res.status(200).json(hospital);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


module.exports = router
