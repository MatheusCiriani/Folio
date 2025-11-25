const express = require('express');
const poolPromise = require('../db'); 
const fs = require('fs');
const jwt = require('jsonwebtoken'); 
const { authMiddleware, adminMiddleware } = require('../authMiddleware');
const { upload } = require('../config/multer'); 

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Livros
 *     description: Gerenciamento de livros, avaliações e curtidas
 */

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Retorna uma lista de livros
 *     tags: [Livros]
 *     parameters:
 *       - in: query
 *         name: genre
 *         schema:
 *           type: integer
 *         description: ID do gênero para filtrar
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de busca (título ou autor)
 *       - in: query
 *         name: excludeListId
 *         schema:
 *           type: integer
 *         description: ID de uma lista para excluir livros que já estão nela
 *     responses:
 *       200:
 *         description: Lista de livros recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   titulo:
 *                     type: string
 *                   autor:
 *                     type: string
 *                   capa:
 *                     type: string
 */
router.get('/', async (req, res) => {
    try {
        const { genre, search, excludeListId } = req.query; 
        const pool = await poolPromise;

        let query = 'SELECT DISTINCT l.* FROM livros l';
        const params = [];
        let joinClauses = [];
        let whereClauses = [];

        if (genre && genre !== '') {
            joinClauses.push('JOIN livros_generos lg ON l.id = lg.livro_id');
            whereClauses.push('lg.genero_id = ?');
            params.push(genre);
        }
        
        if (search && search.trim() !== '') {
            whereClauses.push('(l.titulo LIKE ? OR l.autor LIKE ?)');
            params.push(`%${search}%`);
            params.push(`%${search}%`);
        }

        if (excludeListId && excludeListId.trim() !== '') {
            joinClauses.push(
                'LEFT JOIN listas_livros ll ON l.id = ll.livro_id AND ll.lista_id = ?'
            );
            whereClauses.push('ll.livro_id IS NULL');
            params.push(excludeListId);
        }

        if (joinClauses.length > 0) {
            query += ' ' + joinClauses.join(' ');
        }
        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ' ORDER BY l.titulo ASC';
        
        if (search) {
            query += ' LIMIT 10';
        }

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar todos os livros:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Retorna os detalhes de um livro específico
 *     tags: [Livros]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do livro
 *     responses:
 *       200:
 *         description: Detalhes do livro recuperados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 titulo:
 *                   type: string
 *                 generos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       nome:
 *                         type: string
 *       404:
 *         description: Livro não encontrado
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        
        const query = `
            SELECT 
                l.*, 
                GROUP_CONCAT(g.id, ':', g.nome) as generos_concat
            FROM livros l
            LEFT JOIN livros_generos lg ON l.id = lg.livro_id
            LEFT JOIN generos g ON lg.genero_id = g.id
            WHERE l.id = ?
            GROUP BY l.id
        `;
        
        const [rows] = await pool.execute(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Livro não encontrado' });
        }
        
        const book = rows[0];

        if (book.generos_concat) {
            book.generos = book.generos_concat.split(',').map(g => {
                const [id, nome] = g.split(':');
                return { id: parseInt(id), nome };
            });
        } else {
            book.generos = [];
        }
        delete book.generos_concat;

        res.status(200).json(book);

    } catch (error) {
        console.error('Erro ao buscar o livro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Cria um novo livro (Requer autenticação)
 *     tags: [Livros]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - autor
 *             properties:
 *               titulo:
 *                 type: string
 *               autor:
 *                 type: string
 *               sinopse:
 *                 type: string
 *               capa:
 *                 type: string
 *               generos:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Lista de IDs dos gêneros
 *     responses:
 *       201:
 *         description: Livro criado com sucesso
 *       400:
 *         description: Campos obrigatórios faltando
 */
router.post('/', authMiddleware, async (req, res) => {
    let connection; 
    try {
        const pool = await poolPromise;
        connection = await pool.getConnection(); 
        
        const { titulo, autor, sinopse, capa, generos } = req.body;
        
        if (!titulo || !autor) {
            return res.status(400).json({ message: 'Os campos título e autor são obrigatórios.' });
        }
        
        await connection.beginTransaction();

        const [result] = await connection.execute(
            "INSERT INTO livros (titulo, autor, sinopse, capa) VALUES (?, ?, ?, ?)",
            [titulo, autor, sinopse, capa]
        );
        
        const livroId = result.insertId;

        if (generos && generos.length > 0) {
            const generosValues = generos.map(generoId => [livroId, generoId]);
            await connection.query(
                "INSERT INTO livros_generos (livro_id, genero_id) VALUES ?",
                [generosValues]
            );
        }

        await connection.commit();

        res.status(201).json({
            id: livroId,
            titulo,
            autor,
            sinopse,
            capa,
            generos
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao criar o livro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Atualiza um livro existente (Requer autenticação)
 *     tags: [Livros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do livro a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               autor:
 *                 type: string
 *               sinopse:
 *                 type: string
 *               capa:
 *                 type: string
 *               generos:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Livro atualizado com sucesso
 *       500:
 *         description: Erro no servidor
 */
router.put('/:id', authMiddleware, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { titulo, autor, sinopse, capa, generos } = req.body;
        
        const pool = await poolPromise;
        connection = await pool.getConnection();
        
        await connection.beginTransaction();

        await connection.execute(
            "UPDATE livros SET titulo = ?, autor = ?, sinopse = ?, capa = ? WHERE id = ?",
            [titulo, autor, sinopse, capa, id]
        );

        await connection.execute("DELETE FROM livros_generos WHERE livro_id = ?", [id]);

        if (generos && generos.length > 0) {
            const generosValues = generos.map(generoId => [id, generoId]);
            await connection.query(
                "INSERT INTO livros_generos (livro_id, genero_id) VALUES ?",
                [generosValues]
            );
        }
        
        await connection.commit();

        res.status(200).json({
            id: parseInt(id),
            titulo,
            autor,
            sinopse,
            capa,
            generos
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao editar o livro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * @swagger
 * /api/books/{id}/comments:
 *   get:
 *     summary: Lista os comentários de um livro
 *     tags: [Livros]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do livro
 *     responses:
 *       200:
 *         description: Lista de comentários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   texto:
 *                     type: string
 *                   usuario_nome:
 *                     type: string
 *                   nota:
 *                     type: integer
 */
router.get('/:id/comments', async (req, res) => {
    try {
        const pool = await poolPromise; 
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

/**
 * @swagger
 * /api/books/{id}/review:
 *   post:
 *     summary: Adiciona uma avaliação (comentário + nota) a um livro
 *     tags: [Livros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do livro
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
 *                 description: Comentário
 *               nota:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Nota de 1 a 5
 *     responses:
 *       201:
 *         description: Avaliação enviada com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post('/:id/review', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
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

/**
 * @swagger
 * /api/books/{id}/like:
 *   post:
 *     summary: Curte ou descurte um livro (toggle)
 *     tags: [Livros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do livro
 *     responses:
 *       200:
 *         description: Curtida removida
 *       201:
 *         description: Livro curtido
 */
router.post('/:id/like', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise; 
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

router.get('/:id/likes', async (req, res) => {
    try {
        const pool = await poolPromise; 
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
