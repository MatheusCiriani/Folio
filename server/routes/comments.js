const express = require('express');
const poolPromise = require('../db');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../authMiddleware');

const router = express.Router();

// --- ROTA: Atualizar (EDITAR) um comentário/avaliação
// PUT /api/comments/:commentId -> PUT /:commentId
router.put('/:commentId', authMiddleware, async (req, res) => {
    try {

        const pool = await poolPromise; // <<< 2. ADICIONE O AWAIT
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

// --- ROTA: Deletar um comentário/avaliação
// DELETE /api/comments/:commentId -> DELETE /:commentId
router.delete('/:commentId', authMiddleware, async (req, res) => {
    try {

        const pool = await poolPromise; // <<< 2. ADICIONE O AWAIT
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

// --- ROTA: Curtir ou descurtir um comentário
// POST /api/comments/:id/like -> POST /:id/like
router.post('/:id/like', authMiddleware, async (req, res) => {
    try {

        const pool = await poolPromise; // <<< 2. ADICIONE O AWAIT
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

// --- ROTA: Obter total de curtidas de um comentário
// GET /api/comments/:id/likes -> GET /:id/likes
router.get('/:id/likes', async (req, res) => {
    try {

        const pool = await poolPromise; // <<< 2. ADICIONE O AWAIT
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
                // token inválido ou expirado → ignora
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