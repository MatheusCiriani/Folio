const express = require('express');
const poolPromise = require('../db');
const { authMiddleware } = require('../authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Recomendações
 *     description: Sistema de indicação de livros entre usuários
 */

/**
 * @swagger
 * /api/recommendations:
 *   post:
 *     summary: Indica um livro para outro usuário (Requer autenticação)
 *     tags: [Recomendações]
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
 *                 description: ID do livro a ser indicado
 *               usuario_destino_id:
 *                 type: integer
 *                 description: ID do usuário que receberá a indicação
 *     responses:
 *       201:
 *         description: Livro indicado com sucesso
 *       400:
 *         description: Dados inválidos ou tentativa de indicar para si mesmo
 *       404:
 *         description: Livro ou usuário destinatário não encontrado
 *       500:
 *         description: Erro no servidor
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
        const usuario_origem_id = req.user.id;
        const { livro_id, usuario_destino_id } = req.body;

        if (!livro_id || !usuario_destino_id) {
            return res.status(400).json({ message: "O ID do livro e o ID do destinatário são obrigatórios." });
        }

        if (parseInt(usuario_origem_id) === parseInt(usuario_destino_id)) {
            return res.status(400).json({ message: "Você não pode indicar um livro para si mesmo." });
        }

        const [livroRows] = await pool.execute('SELECT id FROM livros WHERE id = ?', [livro_id]);
        if (livroRows.length === 0) {
            return res.status(404).json({ message: "Livro não encontrado." });
        }

        const [destinoRows] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [usuario_destino_id]);
        if (destinoRows.length === 0) {
            return res.status(404).json({ message: "Usuário destinatário não encontrado." });
        }

        const [result] = await pool.execute(
            'INSERT INTO indicacoes (livro_id, usuario_origem_id, usuario_destino_id) VALUES (?, ?, ?)',
            [livro_id, usuario_origem_id, usuario_destino_id]
        );

        res.status(201).json({
            message: "Livro indicado com sucesso!",
            id: result.insertId
        });

    } catch (error) {
        console.error('Erro ao enviar indicação:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao enviar indicação.' });
    }
});

/**
 * @swagger
 * /api/recommendations/received:
 *   get:
 *     summary: Lista as indicações recebidas pelo usuário logado
 *     tags: [Recomendações]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de indicações recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   indicacao_id:
 *                     type: integer
 *                   criado_em:
 *                     type: string
 *                     format: date-time
 *                   livro_id:
 *                     type: integer
 *                   livro_titulo:
 *                     type: string
 *                   livro_autor:
 *                     type: string
 *                   origem_id:
 *                     type: integer
 *                     description: "ID de quem indicou"
 *                   origem_nome:
 *                     type: string
 *                     description: "Nome de quem indicou"
 *       500:
 *         description: Erro no servidor
 */
router.get('/received', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
        const usuario_destino_id = req.user.id;

        const [rows] = await pool.execute(
            `SELECT 
                i.id AS indicacao_id, i.criado_em,
                l.id AS livro_id, l.titulo AS livro_titulo, l.autor AS livro_autor,
                u.id AS origem_id, u.nome AS origem_nome
             FROM indicacoes i
             JOIN livros l ON i.livro_id = l.id
             JOIN usuarios u ON i.usuario_origem_id = u.id
             WHERE i.usuario_destino_id = ?
             ORDER BY i.criado_em DESC`,
            [usuario_destino_id]
        );

        res.status(200).json(rows);

    } catch (error) {
        console.error('Erro ao buscar indicações recebidas:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar indicações.' });
    }
});

module.exports = router;
