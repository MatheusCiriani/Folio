const express = require('express');
const poolPromise = require('../db');
const { authMiddleware } = require('../authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Usuários
 *     description: Gerenciamento de perfis e relacionamentos (seguir)
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Retorna os dados do perfil do usuário logado
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do perfil recuperados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 nome:
 *                   type: string
 *                 email:
 *                   type: string
 *                 criado_em:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro no servidor
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const userId = req.user.id;
        const [rows] = await pool.execute(
            'SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar "meu" perfil:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Atualiza os dados do perfil do usuário logado
 *     tags: [Usuários]
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
 *                 description: Novo nome do usuário
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *       400:
 *         description: Nome não fornecido
 *       500:
 *         description: Erro no servidor
 */
router.put('/me', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const userId = req.user.id;
        const { nome } = req.body;

        if (!nome) {
            return res.status(400).json({ message: 'O nome é obrigatório.' });
        }

        await pool.execute(
            'UPDATE usuarios SET nome = ? WHERE id = ?',
            [nome, userId]
        );

        const [rows] = await pool.execute(
            'SELECT id, nome, email FROM usuarios WHERE id = ?',
            [userId]
        );

        res.status(200).json({ message: 'Perfil atualizado com sucesso!', user: rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

/**
 * @swagger
 * /api/users/me/following:
 *   get:
 *     summary: Retorna a lista de usuários que o usuário logado segue
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de seguidos recuperada com sucesso
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
 *       500:
 *         description: Erro no servidor
 */
router.get('/me/following', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const loggedInUserId = req.user.id;

        const [rows] = await pool.execute(
            `SELECT 
                u.id, 
                u.nome
             FROM seguir s
             JOIN usuarios u ON s.usuario_seguido_id = u.id
             WHERE s.usuario_seguidor_id = ?
             ORDER BY u.nome ASC`,
            [loggedInUserId]
        );

        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar lista de "seguindo":', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

/**
 * @swagger
 * /api/users/{userId}/profile:
 *   get:
 *     summary: Obtém dados públicos do perfil de outro usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário a ser consultado
 *     responses:
 *       200:
 *         description: Perfil público retornado com status de "seguindo"
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro no servidor
 */
router.get('/:userId/profile', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { userId } = req.params;
        const loggedInUserId = req.user.id;

        const [userRows] = await pool.execute(
            'SELECT id, nome, email FROM usuarios WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const profileUser = userRows[0];

        const [followRows] = await pool.execute(
            'SELECT * FROM seguir WHERE usuario_seguidor_id = ? AND usuario_seguido_id = ?',
            [loggedInUserId, userId]
        );

        if (profileUser.id !== loggedInUserId) {
            delete profileUser.email;
        }

        res.status(200).json({
            ...profileUser,
            isFollowing: followRows.length > 0
        });

    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

/**
 * @swagger
 * /api/users/{userId}/liked-books:
 *   get:
 *     summary: Retorna os últimos 5 livros curtidos por um usuário
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de livros curtidos
 *       500:
 *         description: Erro no servidor
 */
router.get('/:userId/liked-books', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { userId } = req.params;

        const [rows] = await pool.execute(
            `SELECT 
                l.id, 
                l.titulo, 
                l.capa,
                c.criado_em AS data_curtida
             FROM curtidas c
             JOIN livros l ON c.livro_id = l.id
             WHERE c.usuario_id = ? 
             ORDER BY c.criado_em DESC
             LIMIT 5`,
            [userId]
        );

        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar livros curtidos:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

/**
 * @swagger
 * /api/users/{userId}/lists:
 *   get:
 *     summary: Retorna todas as listas públicas de um usuário
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listas recuperadas com sucesso
 *       500:
 *         description: Erro no servidor
 */
router.get('/:userId/lists', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { userId } = req.params;

        const [lists] = await pool.execute(
            `SELECT 
                lu.id, 
                lu.nome, 
                COUNT(ll.livro_id) AS total_livros
             FROM listas_usuarios lu
             LEFT JOIN listas_livros ll ON lu.id = ll.lista_id
             WHERE lu.usuario_id = ?
             GROUP BY lu.id
             ORDER BY lu.nome ASC`,
            [userId]
        );

        res.status(200).json(lists);
    } catch (error) {
        console.error('Erro ao buscar listas públicas do usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

/**
 * @swagger
 * /api/users/{followingId}/follow:
 *   post:
 *     summary: Segue um usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário a ser seguido
 *     responses:
 *       201:
 *         description: Usuário seguido com sucesso
 *       400:
 *         description: Tentativa de seguir a si mesmo
 *       404:
 *         description: Usuário a ser seguido não encontrado
 *       409:
 *         description: Usuário já está sendo seguido
 *       500:
 *         description: Erro no servidor
 */
router.post('/:followingId/follow', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const followerId = req.user.id;
        const { followingId } = req.params;

        if (parseInt(followerId) === parseInt(followingId)) {
            return res.status(400).json({ message: 'Você não pode seguir a si mesmo.' });
        }

        const [userRows] = await pool.execute(
            'SELECT id FROM usuarios WHERE id = ?',
            [followingId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ message: 'Usuário a ser seguido não encontrado.' });
        }

        const [followRows] = await pool.execute(
            'SELECT * FROM seguir WHERE usuario_seguidor_id = ? AND usuario_seguido_id = ?',
            [followerId, followingId]
        );

        if (followRows.length > 0) {
            return res.status(409).json({ message: 'Você já segue este usuário.' });
        }

        await pool.execute(
            'INSERT INTO seguir (usuario_seguidor_id, usuario_seguido_id) VALUES (?, ?)',
            [followerId, followingId]
        );

        res.status(201).json({ message: 'Usuário seguido com sucesso!' });

    } catch (error) {
        console.error('Erro ao seguir usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao seguir usuário.' });
    }
});

/**
 * @swagger
 * /api/users/{followingId}/unfollow:
 *   delete:
 *     summary: Deixa de seguir um usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário que deixará de ser seguido
 *     responses:
 *       200:
 *         description: Usuário deixado de seguir com sucesso
 *       404:
 *         description: Você não seguia este usuário
 *       500:
 *         description: Erro no servidor
 */
router.delete('/:followingId/unfollow', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;
        const followerId = req.user.id;
        const { followingId } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM seguir WHERE usuario_seguidor_id = ? AND usuario_seguido_id = ?',
            [followerId, followingId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Você não seguia este usuário.' });
        }

        res.status(200).json({ message: 'Usuário deixado de seguir com sucesso.' });

    } catch (error) {
        console.error('Erro ao deixar de seguir usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao deixar de seguir usuário.' });
    }
});

module.exports = router;
