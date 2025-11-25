const express = require('express');
const poolPromise = require('../db');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Comentários
 *     description: Gerenciamento de comentários e avaliações
 */

/**
 * @swagger
 * /api/comments/{commentId}:
 *   put:
 *     summary: Atualiza um comentário e a nota da avaliação (Requer autenticação)
 *     tags: [Comentários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do comentário a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - texto
 *               - nota
 *             properties:
 *               texto:
 *                 type: string
 *                 description: Novo texto do comentário
 *               nota:
 *                 type: integer
 *                 description: Nova nota (1-5)
 *     responses:
 *       200:
 *         description: Avaliação atualizada com sucesso
 *       403:
 *         description: Acesso negado (não é o autor)
 *       404:
 *         description: Comentário não encontrado
 *       500:
 *         description: Erro no servidor
 */
router.put('/:commentId', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
        const { commentId } = req.params;
        const { id: usuario_id } = req.user;
        const { texto, nota } = req.body;

        const [rows] = await pool.execute('SELECT * FROM comentarios WHERE id = ?', [commentId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Comentário não encontrado.' });
        }

        const comentario = rows[0];

        if (comentario.usuario_id !== usuario_id) {
            return res.status(403).json({ message: 'Acesso negado. Você não é o autor deste comentário.' });
        }

        await pool.execute('UPDATE comentarios SET texto = ? WHERE id = ?', [texto, commentId]);
        await pool.execute(
            'UPDATE avaliacoes SET nota = ? WHERE livro_id = ? AND usuario_id = ?',
            [nota, comentario.livro_id, usuario_id]
        );

        res.status(200).json({ message: 'Avaliação atualizada com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar avaliação:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

/**
 * @swagger
 * /api/comments/{commentId}:
 *   delete:
 *     summary: Remove um comentário e a avaliação associada (Requer autenticação)
 *     tags: [Comentários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do comentário a ser removido
 *     responses:
 *       200:
 *         description: Avaliação deletada com sucesso
 *       403:
 *         description: Acesso negado
 *       500:
 *         description: Erro no servidor
 */
router.delete('/:commentId', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
        const { commentId } = req.params;
        const { id: usuario_id } = req.user;

        const [rows] = await pool.execute('SELECT * FROM comentarios WHERE id = ?', [commentId]);

        if (rows.length === 0) {
            return res.status(200).json({ message: 'Comentário já removido.' });
        }

        const comentario = rows[0];

        if (comentario.usuario_id !== usuario_id) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        await pool.execute(
            'DELETE FROM avaliacoes WHERE livro_id = ? AND usuario_id = ?',
            [comentario.livro_id, usuario_id]
        );

        await pool.execute('DELETE FROM comentarios WHERE id = ?', [commentId]);

        res.status(200).json({ message: 'Avaliação deletada com sucesso!' });

    } catch (error) {
        console.error('Erro ao deletar avaliação:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

/**
 * @swagger
 * /api/comments/{id}/like:
 *   post:
 *     summary: Curte ou descurte um comentário (toggle)
 *     tags: [Comentários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do comentário
 *     responses:
 *       200:
 *         description: Curtida removida (liked false)
 *       201:
 *         description: Comentário curtido (liked true)
 *       500:
 *         description: Erro no servidor
 */
router.post('/:id/like', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
        const { id: comentario_id } = req.params;
        const { id: usuario_id } = req.user;

        const [rows] = await pool.execute(
            'SELECT * FROM curtidas WHERE usuario_id = ? AND comentario_id = ?',
            [usuario_id, comentario_id]
        );

        if (rows.length > 0) {
            await pool.execute('DELETE FROM curtidas WHERE usuario_id = ? AND comentario_id = ?', [usuario_id, comentario_id]);
            return res.status(200).json({ liked: false, message: 'Curtida removida.' });
        } else {
            await pool.execute('INSERT INTO curtidas (usuario_id, comentario_id) VALUES (?, ?)', [usuario_id, comentario_id]);
            return res.status(201).json({ liked: true, message: 'Comentário curtido com sucesso!' });
        }

    } catch (error) {
        console.error('Erro ao curtir comentário:', error);
        res.status(500).json({ message: 'Erro interno ao curtir comentário.' });
    }
});

/**
 * @swagger
 * /api/comments/{id}/likes:
 *   get:
 *     summary: Obtém o total de curtidas de um comentário
 *     tags: [Comentários]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do comentário
 *     responses:
 *       200:
 *         description: Contagem de curtidas retornada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCurtidas:
 *                   type: integer
 *                 userLiked:
 *                   type: boolean
 *       500:
 *         description: Erro no servidor
 */
router.get('/:id/likes', async (req, res) => {
    try {
        const pool = await poolPromise; 
        const { id: comentario_id } = req.params;

        const [countRows] = await pool.execute(
            'SELECT COUNT(*) AS totalCurtidas FROM curtidas WHERE comentario_id = ?',
            [comentario_id]
        );

        let userLiked = false;

        const authHeader = req.headers.authorization || '';

        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id;

                const [userRows] = await pool.execute(
                    'SELECT COUNT(*) as hasLiked FROM curtidas WHERE comentario_id = ? AND usuario_id = ?',
                    [comentario_id, userId]
                );

                userLiked = userRows[0].hasLiked > 0;

            } catch {
                // Token inválido → ignora
            }
        }

        res.status(200).json({
            totalCurtidas: countRows[0].totalCurtidas,
            userLiked
        });

    } catch (error) {
        console.error('Erro ao buscar curtidas de comentário:', error);
        res.status(500).json({ message: 'Erro interno ao buscar curtidas.' });
    }
});

module.exports = router;
