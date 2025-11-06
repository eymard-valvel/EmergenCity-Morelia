const app = require('express');
const router = app.Router();
const ReportePrehospitalarioController = require('../controllers/reportePrehospitalarioController.js');
const reportePrehospitalarioController = new ReportePrehospitalarioController();

router.get('/', reportePrehospitalarioController.getAllReportePrehospitalario.bind(reportePrehospitalarioController));
router.post('/', reportePrehospitalarioController.createReportePrehospitalario.bind(reportePrehospitalarioController));
router.put('/:id', reportePrehospitalarioController.updateReportePrehospitalario.bind(reportePrehospitalarioController));
router.delete('/:id', reportePrehospitalarioController.deleteReportePrehospitalario.bind(reportePrehospitalarioController));
router.get('/:id', reportePrehospitalarioController.getReporteById.bind(reportePrehospitalarioController));

module.exports = router;
