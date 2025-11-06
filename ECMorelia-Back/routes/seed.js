/**
 * @swagger
 * /seed:
 *   post:
 *     summary: Seed data en todas las tablas.
 *     description: Elimina los datos existentes en las tablas y agrega nuevos registros según los datos predefinidos (seeds).
 *     tags:
 *       - Seed
 *     responses:
 *       200:
 *         description: Operación exitosa. Se devuelven los registros insertados.
 */

const app = require('express')
const router = app.Router()
const SeedController = require('../controllers/seedController')
const seedController = new SeedController()

router.post('/', seedController.run.bind(seedController))

module.exports = router
