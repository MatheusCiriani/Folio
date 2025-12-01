const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genre.controller');

/**
 * @swagger
 * tags:
 *   - name: Gêneros
 *     description: Listagem de gêneros literários
 */

/**
 * @swagger
 * /api/genres:
 *   get:
 *     summary: Retorna a lista de todos os gêneros
 *     tags:
 *       - Gêneros
 *     responses:
 *       200:
 *         description: Lista de gêneros recuperada
 */
router.get('/', genreController.getAll);

module.exports = router;
