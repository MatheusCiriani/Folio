// server/routes/lists.js
const express = require('express');
const poolPromise = require('../db'); 
const { authMiddleware } = require('../authMiddleware');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Listas
 *     description: Gerenciamento de listas de leitura personalizadas
 */

/**
 * @swagger
 * /api/lists:
 *   get:
 *     summary: Retorna todas as listas do usuário logado
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listas recuperadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   nome:
 *                     type: string
 *                   criado_em:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
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

/**
 * @swagger
 * /api/lists:
 *   post:
 *     summary: Cria uma nova lista para o usuário
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *             properties:
 *               nome:
 *                 type: string
 *                 description: Nome da nova lista
 *     responses:
 *       201:
 *         description: Lista criada com sucesso
 *       400:
 *         description: Nome não fornecido
 *       409:
 *         description: Já existe uma lista com esse nome
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
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

/**
 * @swagger
 * /api/lists/{listId}:
 *   put:
 *     summary: Renomeia uma lista existente
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da lista
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *             properties:
 *               nome:
 *                 type: string
 *                 description: Novo nome para a lista
 *     responses:
 *       200:
 *         description: Lista atualizada com sucesso
 *       404:
 *         description: Lista não encontrada ou sem permissão
 */
router.put('/:listId', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
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

/**
 * @swagger
 * /api/lists/{listId}:
 *   delete:
 *     summary: Exclui uma lista
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da lista a ser deletada
 *     responses:
 *       200:
 *         description: Lista deletada com sucesso
 *       404:
 *         description: Lista não encontrada ou sem permissão
 */
router.delete('/:listId', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
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

/**
 * @swagger
 * /api/lists/{listId}/books:
 *   get:
 *     summary: Lista os livros dentro de uma lista específica
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da lista
 *     responses:
 *       200:
 *         description: Detalhes da lista e os livros contidos nela
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 nome:
 *                   type: string
 *                 livros:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       titulo:
 *                         type: string
 *                       capa:
 *                         type: string
 *       404:
 *         description: Lista não encontrada
 */
router.get('/:listId/books', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
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

/**
 * @swagger
 * /api/lists/{listId}/books:
 *   post:
 *     summary: Adiciona um livro a uma lista
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da lista
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookId
 *             properties:
 *               bookId:
 *                 type: integer
 *                 description: ID do livro a ser adicionado
 *     responses:
 *       201:
 *         description: Livro adicionado com sucesso
 *       403:
 *         description: Sem permissão (não é o dono da lista)
 *       409:
 *         description: Livro já está na lista
 */
router.post('/:listId/books', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
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

/**
 * @swagger
 * /api/lists/{listId}/books/{bookId}:
 *   delete:
 *     summary: Remove um livro de uma lista
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da lista
 *       - in: path
 *         name: bookId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do livro a remover
 *     responses:
 *       200:
 *         description: Livro removido da lista
 *       404:
 *         description: Livro não encontrado na lista
 */

router.delete('/:listId/books/:bookId', authMiddleware, async (req, res) => {
    const pool = await poolPromise;
    const { listId, bookId } = req.params;

    const [listOwner] = await pool.execute(
        'SELECT id FROM listas_usuarios WHERE id = ? AND usuario_id = ?',
        [listId, req.user.id]
    );

    if (listOwner.length === 0) {
        return res.status(403).json({ message: 'Você não tem permissão para remover livros desta lista.' });
    }

    const [result] = await pool.execute(
        'DELETE FROM listas_livros WHERE lista_id = ? AND livro_id = ?',
        [listId, bookId]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'O livro não estava nesta lista.' });
    }

    res.status(200).json({ message: 'Livro removido da lista.' });
});

module.exports = router;
