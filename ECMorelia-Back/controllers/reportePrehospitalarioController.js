const ReportePrehospitalarioService = require('../services/reportePrehospitalarioService');

class ReportePrehospitalarioController {
  constructor() {
    this.reportePrehospitalarioService = new ReportePrehospitalarioService();
  }

  async createReportePrehospitalario(req, res) {
    try {
      const data = req.body;
      const reporte = await this.reportePrehospitalarioService.addRecord(data);
      res.status(201).send({
        message: 'New reporte prehospitalario added successfully',
        reporte,
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getAllReportePrehospitalario(req, res) {
    try {
      const reportes = await this.reportePrehospitalarioService.getAllRecords();
      return res.status(200).send(reportes);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getReporteById(req, res) {
    try {
      const { id } = req.params;
      const reporte = await this.reportePrehospitalarioService.getRecordById(id);

      if (reporte) {
        res.status(200).json(reporte);
      } else {
        res.status(404).json({ message: 'Reporte no encontrado' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }


  async updateReportePrehospitalario(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      await this.reportePrehospitalarioService.updateById({ id, data });
      res.status(200).json({ message: 'Success update' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteReportePrehospitalario(req, res) {
    try {
      const { id } = req.params;
      await this.reportePrehospitalarioService.deleteById(id);
      res.status(200).json({ message: 'Success delete' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = ReportePrehospitalarioController;