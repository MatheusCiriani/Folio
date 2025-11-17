const express = require('express');
const poolPromise = require('../db');
const { authMiddleware } = require('../authMiddleware');

const router = express.Router();

// --- ROTA: Indicar um livro
// POST /api/recommendations -> POST /
router.post('/', authMiddleware, async (req, res) => {
    try {

        const pool = await poolPromise; // <<< 2. ADICIONE O AWAIT
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

// --- ROTA: Listar indicações recebidas
// GET /api/recommendations/received -> GET /received
router.get('/received', authMiddleware, async (req, res) => {
    try {

        const pool = await poolPromise; // <<< 2. ADICIONE O AWAIT
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