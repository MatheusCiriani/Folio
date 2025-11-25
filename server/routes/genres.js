// server/routes/genres.js
const express = require('express');
const poolPromise = require('../db'); 
const router = express.Router();

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
 *     summary: Retorna a lista de todos os gêneros disponíveis
 *     tags: [Gêneros]
 *     responses:
 *       200:
 *         description: Lista de gêneros recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: ID do gênero
 *                   nome:
 *                     type: string
 *                     description: "Nome do gênero (ex: Ficção, Terror)"
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise; 
        const [rows] = await pool.execute("SELECT * FROM generos ORDER BY nome ASC");
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar gêneros:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

module.exports = router;
