const express = require('express');
const router = express.Router();
const recController = require('../controllers/recommendation.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Recomendações
 *     description: Sistema de indicação de livros
 */

/**
 * @swagger
 * /api/recommendations:
 *   post:
 *     summary: Indica um livro para outro usuário
 *     tags:
 *       - Recomendações
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - livro_id
 *               - usuario_destino_id
 *             properties:
 *               livro_id:
 *                 type: integer
 *               usuario_destino_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Indicado com sucesso
 */
router.post('/', authMiddleware, recController.create);

/**
 * @swagger
 * /api/recommendations/received:
 *   get:
 *     summary: Lista indicações recebidas
 *     tags:
 *       - Recomendações
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de indicações
 */
router.get('/received', authMiddleware, recController.getReceived);

module.exports = router;
