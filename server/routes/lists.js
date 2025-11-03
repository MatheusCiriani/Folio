// server/routes/lists.js
const express = require('express');
const poolPromise = require('../db'); // <<< 1. Renomeie a importação
const { authMiddleware } = require('../authMiddleware');
const router = express.Router();

// --- ROTAS DE LISTAS ---

// GET /api/lists/
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const [lists] = await pool.execute(
            'SELECT id, nome, criado_em FROM listas_usuarios WHERE usuario_id = ? ORDER BY nome ASC',
            [req.user.id]
        );
        res.status(200).json(lists);
    } catch (error) {
        console.error('Erro ao buscar listas do usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// POST /api/lists/
router.post('/', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ message: 'O nome da lista é obrigatório.' });
        }
        const [result] = await pool.execute(
            'INSERT INTO listas_usuarios (usuario_id, nome) VALUES (?, ?)',
            [req.user.id, nome]
        );
        res.status(201).json({ id: result.insertId, nome });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Você já possui uma lista com esse nome.' });
        }
        console.error('Erro ao criar lista:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// PUT /api/lists/:listId
router.put('/:listId', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const { listId } = req.params;
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ message: 'O nome é obrigatório.' });
        }
        const [result] = await pool.execute(
            'UPDATE listas_usuarios SET nome = ? WHERE id = ? AND usuario_id = ?',
            [nome, listId, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Lista não encontrada ou você não tem permissão.' });
        }
        res.status(200).json({ message: 'Lista atualizada com sucesso.' });
    } catch (error) {
         if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Você já possui uma lista com esse nome.' });
        }
        console.error('Erro ao atualizar lista:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// DELETE /api/lists/:listId
router.delete('/:listId', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const { listId } = req.params;
        const [result] = await pool.execute(
            'DELETE FROM listas_usuarios WHERE id = ? AND usuario_id = ?',
            [listId, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Lista não encontrada ou você não tem permissão.' });
        }
        res.status(200).json({ message: 'Lista deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar lista:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// --- ROTAS DE LIVROS NAS LISTAS ---

// GET /api/lists/:listId/books
router.get('/:listId/books', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const { listId } = req.params;

        let listDetails;
        const [listOwner] = await pool.execute(
            'SELECT id, nome FROM listas_usuarios WHERE id = ? AND usuario_id = ?',
            [listId, req.user.id]
        );
        
        if (listOwner.length > 0) {
             listDetails = listOwner[0];
        } else {
             const [publicList] = await pool.execute(
                'SELECT id, nome FROM listas_usuarios WHERE id = ?',
                [listId]
             );
             if (publicList.length === 0) {
                 return res.status(404).json({ message: 'Lista não encontrada.' });
             }
             listDetails = publicList[0];
        }

        const [books] = await pool.execute(
            `SELECT l.id, l.titulo, l.capa 
             FROM listas_livros ll
             JOIN livros l ON ll.livro_id = l.id
             WHERE ll.lista_id = ?
             ORDER BY ll.adicionado_em DESC`,
            [listId]
        );

        res.status(200).json({
            id: listDetails.id,
            nome: listDetails.nome,
            livros: books
        });
        
    } catch (error) {
        console.error('Erro ao buscar livros da lista:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});


// POST /api/lists/:listId/books
router.post('/:listId/books', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const { listId } = req.params;
        const { bookId } = req.body;
        if (!bookId) {
            return res.status(400).json({ message: 'ID do livro é obrigatório.' });
        }
        
        const [listOwner] = await pool.execute(
            'SELECT id FROM listas_usuarios WHERE id = ? AND usuario_id = ?',
            [listId, req.user.id]
        );
        if (listOwner.length === 0) {
            return res.status(403).json({ message: 'Você não tem permissão para adicionar livros a esta lista.' });
        }

        await pool.execute(
            'INSERT INTO listas_livros (lista_id, livro_id) VALUES (?, ?)',
            [listId, bookId]
        );
        
        res.status(201).json({ message: 'Livro adicionado à lista com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Este livro já está nessa lista.' });
        }
        console.error('Erro ao adicionar livro à lista:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// (Opcional) Rota para remover um livro da lista (não foi pedida, mas é boa prática)
// DELETE /api/lists/:listId/books/:bookId
router.delete('/:listId/books/:bookId', authMiddleware, async (req, res) => {
    // ... Lógica para verificar o dono e deletar de 'listas_livros' ...
});


module.exports = router;