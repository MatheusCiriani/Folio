const express = require('express');
const pool = require('../db');
const fs = require('fs');
const { authMiddleware, adminMiddleware } = require('../authMiddleware');
const { upload } = require('../config/multer'); // Importa o multer configurado

const router = express.Router();

// --- ROTA: Buscar todos os livros
// GET /api/books -> GET /
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM livros ORDER BY titulo ASC");
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar todos os livros:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// --- ROTA: Buscar um livro pelo ID
// GET /api/books/:id -> GET /:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute("SELECT * FROM livros WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Livro não encontrado' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar o livro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// --- ROTA: Criar um novo livro
// POST /api/books -> POST /
router.post('/', authMiddleware, upload.single('capa'), async (req, res) => {
    try {
        const { titulo, autor, sinopse } = req.body;
        if (!titulo || !autor) {
            return res.status(400).json({ message: 'Os campos título e autor são obrigatórios.' });
        }
        const capaPath = req.file ? req.file.path.replace(/\\/g, "/") : null;
        const [result] = await pool.execute(
            "INSERT INTO livros (titulo, autor, sinopse, capa) VALUES (?, ?, ?, ?)",
            [titulo, autor, sinopse, capaPath]
        );
        res.status(201).json({
            id: result.insertId,
            titulo,
            autor,
            sinopse,
            capa: capaPath
        });
    } catch (error) {
        console.error('Erro ao criar o livro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// --- ROTA: Editar um livro existente
// PUT /api/books/:id -> PUT /:id
router.put('/:id', authMiddleware, upload.single('capa'), async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, autor, sinopse } = req.body;
        const [rows] = await pool.execute("SELECT capa FROM livros WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Livro não encontrado' });
        }
        const oldCapaPath = rows[0].capa;
        let capaPath = oldCapaPath;
        if (req.file) {
            capaPath = req.file.path.replace(/\\/g, "/");
            if (oldCapaPath && fs.existsSync(oldCapaPath)) {
                fs.unlinkSync(oldCapaPath);
            }
        }
        await pool.execute(
            "UPDATE livros SET titulo = ?, autor = ?, sinopse = ?, capa = ? WHERE id = ?",
            [titulo, autor, sinopse, capaPath, id]
        );
        res.status(200).json({
            id: parseInt(id),
            titulo,
            autor,
            sinopse,
            capa: capaPath
        });
    } catch (error) {
        console.error('Erro ao editar o livro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// --- ROTA: Buscar comentários de um livro
// GET /api/books/:id/comments
router.get('/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const [comments] = await pool.execute(
            `SELECT 
                c.id, c.texto, c.criado_em, c.usuario_id,
                COALESCE(u.nome, 'Usuário Desconhecido') as usuario_nome, 
                (SELECT COUNT(*) FROM curtidas cu WHERE cu.comentario_id = c.id) as curtidas,
                a.nota
            FROM comentarios c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            LEFT JOIN avaliacoes a ON c.usuario_id = a.usuario_id AND c.livro_id = a.livro_id
            WHERE c.livro_id = ?
            ORDER BY c.criado_em DESC`,
            [id]
        );
        res.status(200).json(comments);
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar comentários' });
    }
});

// --- ROTA: Buscar avaliação média de um livro
// GET /api/books/:id/rating
router.get('/:id/rating', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.execute(
            `SELECT 
                COALESCE(AVG(nota), 0) as media_avaliacoes, 
                COUNT(nota) as total_avaliacoes
            FROM avaliacoes
            WHERE livro_id = ?`,
            [id]
        );
        res.status(200).json(result[0]);
    } catch (error) {
        console.error('Erro ao buscar avaliação:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar avaliação' });
    }
});

// --- ROTA: Adicionar um comentário e uma avaliação (review)
// POST /api/books/:id/review
router.post('/:id/review', authMiddleware, async (req, res) => {
    try {
        const { id: livro_id } = req.params;
        const { id: usuario_id } = req.user;
        const { texto, nota } = req.body;
        if (!texto || !nota) {
            return res.status(400).json({ message: 'O texto do comentário e a nota são obrigatórios.' });
        }
        if (nota < 1 || nota > 5) {
            return res.status(400).json({ message: 'A nota deve ser entre 1 e 5.' });
        }
        await pool.execute(
            'INSERT INTO comentarios (livro_id, usuario_id, texto) VALUES (?, ?, ?)',
            [livro_id, usuario_id, texto]
        );
        await pool.execute(
            'INSERT INTO avaliacoes (livro_id, usuario_id, nota) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nota = ?',
            [livro_id, usuario_id, nota, nota]
        );
        res.status(201).json({ message: 'Avaliação enviada com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar avaliação:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao salvar avaliação.' });
    }
});

// --- ROTA: Curtir ou descurtir um livro
// POST /api/books/:id/like
router.post('/:id/like', authMiddleware, async (req, res) => {
    try {
        const { id: livro_id } = req.params;
        const { id: usuario_id } = req.user;
        const [rows] = await pool.execute(
            'SELECT * FROM curtidas WHERE usuario_id = ? AND livro_id = ?',
            [usuario_id, livro_id]
        );
        if (rows.length > 0) {
            await pool.execute('DELETE FROM curtidas WHERE usuario_id = ? AND livro_id = ?', [usuario_id, livro_id]);
            return res.status(200).json({ liked: false, message: 'Curtida removida.' });
        } else {
            await pool.execute('INSERT INTO curtidas (usuario_id, livro_id) VALUES (?, ?)', [usuario_id, livro_id]);
            return res.status(201).json({ liked: true, message: 'Livro curtido com sucesso!' });
        }
    } catch (error) {
        console.error('Erro ao curtir livro:', error);
        res.status(500).json({ message: 'Erro interno ao curtir livro.' });
    }
});

// --- ROTA: Obter total de curtidas de um livro
// GET /api/books/:id/likes
router.get('/:id/likes', async (req, res) => {
    try {
        const { id: livro_id } = req.params;
        const [countRows] = await pool.execute(
            'SELECT COUNT(*) AS totalCurtidas FROM curtidas WHERE livro_id = ?',
            [livro_id]
        );
        let userLiked = false;
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id;
                const [userRows] = await pool.execute(
                    'SELECT COUNT(*) as hasLiked FROM curtidas WHERE livro_id = ? AND usuario_id = ?',
                    [livro_id, userId]
                );
                userLiked = userRows[0].hasLiked > 0;
            } catch (err) {
                console.warn('Token inválido ao verificar curtida do usuário.');
            }
        }
        res.status(200).json({
            totalCurtidas: countRows[0].totalCurtidas,
            userLiked
        });
    } catch (error) {
        console.error('Erro ao buscar curtidas:', error);
        res.status(500).json({ message: 'Erro interno ao buscar curtidas.' });
    }
});

module.exports = router;