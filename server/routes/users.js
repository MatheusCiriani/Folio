const express = require('express');
const poolPromise = require('../db');
const { authMiddleware } = require('../authMiddleware');

const router = express.Router();

// Rota para um usuário logado começar a seguir outro usuário
// Método: POST
// URL: /api/users/:followingId/follow
router.post('/:followingId/follow', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const followerId = req.user.id; 
        const { followingId } = req.params; 

        if (parseInt(followerId) === parseInt(followingId)) {
            return res.status(400).json({ message: "Você não pode seguir a si mesmo." });
        }
        
        const [userRows] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [followingId]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: "Usuário a ser seguido não encontrado." });
        }

        const [followRows] = await pool.execute(
            // CORREÇÃO AQUI:
            'SELECT * FROM seguir WHERE usuario_seguidor_id = ? AND usuario_seguido_id = ?',
            [followerId, followingId]
        );

        if (followRows.length > 0) {
            return res.status(409).json({ message: "Você já segue este usuário." });
        }

        await pool.execute(
            // CORREÇÃO AQUI:
            'INSERT INTO seguir (usuario_seguidor_id, usuario_seguido_id) VALUES (?, ?)',
            [followerId, followingId]
        );

        res.status(201).json({ message: "Usuário seguido com sucesso!" });

    } catch (error) {
        console.error('Erro ao seguir usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao seguir usuário.' });
    }
});

// --- ROTA: Deixar de seguir um usuário
// DELETE /api/users/:followingId/follow -> DELETE /:followingId/follow
// Rota para um usuário logado parar de seguir outro usuário
// Método: DELETE
// URL: /api/users/:followingId/follow
router.delete('/:followingId/follow', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const followerId = req.user.id;
        const { followingId } = req.params; 

        const [result] = await pool.execute(
            // CORREÇÃO AQUI:
            'DELETE FROM seguir WHERE usuario_seguidor_id = ? AND usuario_seguido_id = ?',
            [followerId, followingId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Você não seguia este usuário." });
        }

        res.status(200).json({ message: "Usuário deixado de seguir com sucesso." });

    } catch (error) {
        console.error('Erro ao deixar de seguir usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao deixar de seguir usuário.' });
    }
});


// --- ROTAS DE "SEGUIR" (JÁ EXISTENTES) ---
// ... (POST /:followingId/follow e DELETE /:followingId/follow) ...

// --- NOVAS ROTAS DE PERFIL ---

// (FOL-27) ROTA: Obter os últimos 5 livros curtidos por um usuário
// GET /api/users/:userId/liked-books
router.get('/:userId/liked-books', async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const { userId } = req.params;

        const [rows] = await pool.execute(
            `SELECT 
                l.id, 
                l.titulo, 
                l.capa,
                c.criado_em AS data_curtida
             FROM curtidas c
             JOIN livros l ON c.livro_id = l.id
             WHERE c.usuario_id = ? AND c.livro_id IS NOT NULL
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

// (FOL-28) ROTA: Obter dados públicos de um perfil de usuário (para o modal)
// GET /api/users/:userId/profile
router.get('/:userId/profile', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
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

        // 2. Verifica o status de "seguir"
        const [followRows] = await pool.execute(
            // CORREÇÃO AQUI:
            'SELECT * FROM seguir WHERE usuario_seguidor_id = ? AND usuario_seguido_id = ?',
            [loggedInUserId, userId]
        );
        
        if(profileUser.id !== loggedInUserId) {
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

// ROTA: Obter dados do PRÓPRIO perfil (para a página de perfil)
// GET /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
    // authMiddleware é o suficiente, já temos o ID em req.user.id
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const userId = req.user.id;
        const [rows] = await pool.execute(
            'SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (error)
    {
        console.error('Erro ao buscar "meu" perfil:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ROTA: Atualizar o PRÓPRIO perfil (ex: mudar o nome)
// PUT /api/users/me
router.put('/me', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const userId = req.user.id;
        const { nome } = req.body; // Por enquanto, só permitimos alterar o nome

        if (!nome) {
            return res.status(400).json({ message: 'O nome é obrigatório.' });
        }

        await pool.execute(
            'UPDATE usuarios SET nome = ? WHERE id = ?',
            [nome, userId]
        );
        
        // Busca o usuário atualizado para retornar os dados novos
        const [rows] = await pool.execute(
            'SELECT id, nome, email FROM usuarios WHERE id = ?',
            [userId]
        );

        // Importante: Precisamos gerar um NOVO token com o nome atualizado
        // (Seu `routes/auth.js` tem essa lógica, mas para simplificar
        // vamos só retornar o usuário. O token antigo AINDA É VÁLIDO,
        // mas o "nome" dentro dele ficará desatualizado até o próximo login)
        
        // Por agora, vamos apenas atualizar o `localStorage` no frontend
        res.status(200).json({ message: 'Perfil atualizado com sucesso!', user: rows[0] });

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// --- NOVA ROTA: Obter a lista de quem o usuário logado SEGUE ---
// GET /api/users/me/following
router.get('/me/following', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        const loggedInUserId = req.user.id;

        const [rows] = await pool.execute(
            `SELECT 
                u.id, 
                u.nome
             FROM seguir s
             JOIN usuarios u ON s.usuario_seguido_id = u.id  -- <-- CORRETO AQUI
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

// --- NOVA ROTA: Obter todas as listas de um usuário específico (para o modal público) ---
// GET /api/users/:userId/lists
router.get('/:userId/lists', async (req, res) => {
    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
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


module.exports = router;