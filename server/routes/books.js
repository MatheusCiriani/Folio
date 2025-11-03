const express = require('express');
const pool = require('../db');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // <<< ADICIONE ESTA LINHA
const { authMiddleware, adminMiddleware } = require('../authMiddleware');
const { upload } = require('../config/multer'); // Importa o multer configurado

const router = express.Router();

// --- ROTA: Buscar todos os livros (Sem alteração) ---
// router.get('/', async (req, res) => {
//     try {
//         const [rows] = await pool.execute("SELECT * FROM livros ORDER BY titulo ASC");
//         res.status(200).json(rows);
//     } catch (error) {
//         console.error('Erro ao buscar todos os livros:', error);
//         res.status(500).json({ message: 'Erro interno do servidor' });
//     }
// });

router.get('/', async (req, res) => {
    try {
        const { genre } = req.query; // Pega o ?genre=ID da URL
        const pool = await poolPromise; // Espera o pool ficar pronto

        let query = `
            SELECT DISTINCT l.* FROM livros l
        `;
        const params = [];

        // Se um ID de gênero foi passado, fazemos o JOIN
        if (genre && genre !== '') {
            query += `
                JOIN livros_generos lg ON l.id = lg.livro_id
                WHERE lg.genero_id = ?
            `;
            params.push(genre);
        }

        query += " ORDER BY l.titulo ASC";

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar todos os livros:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// --- ROTA: Buscar um livro pelo ID (Sem alteração) ---
// router.get('/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const [rows] = await pool.execute("SELECT * FROM livros WHERE id = ?", [id]);

//         if (rows.length === 0) {
//             return res.status(404).json({ message: 'Livro não encontrado' });
//         }
        
//         // Esta é a linha que estava faltando ou quebrada
//         res.status(200).json(rows[0]); 

//     } catch (error) {
//         console.error('Erro ao buscar o livro:', error);
//         res.status(500).json({ message: 'Erro interno do servidor' });
//     }
// });

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        
        // Usamos GROUP_CONCAT para juntar todos os gêneros num campo só
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

        // Transforma a string "1:Ficção,2:Aventura" em um array de objetos
        if (book.generos_concat) {
            book.generos = book.generos_concat.split(',').map(g => {
                const [id, nome] = g.split(':');
                return { id: parseInt(id), nome };
            });
        } else {
            book.generos = []; // Se não tiver gêneros, retorna array vazio
        }
        delete book.generos_concat; // Remove o campo extra

        res.status(200).json(book); 

    } catch (error) {
        console.error('Erro ao buscar o livro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// --- ROTA: Criar um novo livro (MODIFICADA) ---
// POST /api/books -> POST /
// 1. Removemos o middleware 'upload.single('capa')'
// router.post('/', authMiddleware, async (req, res) => {
//     try {
//         // 2. Adicionamos 'capa' à desestruturação do req.body
//         const { titulo, autor, sinopse, capa } = req.body;
        
//         if (!titulo || !autor) {
//             return res.status(400).json({ message: 'Os campos título e autor são obrigatórios.' });
//         }
        
//         // 3. Removemos a lógica do 'req.file' e usamos a 'capa' (URL) diretamente
//         // const capaPath = req.file ? req.file.path.replace(/\\/g, "/") : null; (Linha antiga)
        
//         const [result] = await pool.execute(
//             "INSERT INTO livros (titulo, autor, sinopse, capa) VALUES (?, ?, ?, ?)",
//             [titulo, autor, sinopse, capa] // Passa a URL da capa
//         );

//         res.status(201).json({
//             id: result.insertId,
//             titulo,
//             autor,
//             sinopse,
//             capa: capa // Retorna a URL da capa
//         });
//     } catch (error) {
//         console.error('Erro ao criar o livro:', error);
//         res.status(500).json({ message: 'Erro interno do servidor' });
//     }
// });

router.post('/', authMiddleware, async (req, res) => {
    let connection; // Definimos a conexão aqui para usá-la no try/catch/finally
    try {
        const pool = await poolPromise;
        connection = await pool.getConnection(); // Pega uma conexão do pool
        
        // 1. Pega os dados (agora inclui 'generos')
        // 'generos' deve ser um array de IDs, ex: [1, 3, 5]
        const { titulo, autor, sinopse, capa, generos } = req.body;
        
        if (!titulo || !autor) {
            return res.status(400).json({ message: 'Os campos título e autor são obrigatórios.' });
        }
        
        // 2. Inicia a Transação
        await connection.beginTransaction();

        // 3. Insere o livro
        const [result] = await connection.execute(
            "INSERT INTO livros (titulo, autor, sinopse, capa) VALUES (?, ?, ?, ?)",
            [titulo, autor, sinopse, capa]
        );
        
        const livroId = result.insertId;

        // 4. Insere os gêneros (se houver)
        if (generos && generos.length > 0) {
            const generosValues = generos.map(generoId => [livroId, generoId]);
            await connection.query(
                "INSERT INTO livros_generos (livro_id, genero_id) VALUES ?",
                [generosValues] // O 'query' formata isso para múltiplos VALUES
            );
        }

        // 5. Commita a Transação
        await connection.commit();

        res.status(201).json({
            id: livroId,
            titulo,
            autor,
            sinopse,
            capa,
            generos // Retorna os IDs dos gêneros
        });

    } catch (error) {
        // 6. Rollback em caso de erro
        if (connection) await connection.rollback();
        console.error('Erro ao criar o livro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    } finally {
        // 7. Libera a conexão de volta para o pool
        if (connection) connection.release();
    }
});

// --- ROTA: Editar um livro existente (MODIFICADA) ---
// PUT /api/books/:id -> PUT /:id
// 1. Removemos o middleware 'upload.single('capa')'
// router.put('/:id', authMiddleware, async (req, res) => {
//     try {
//         const { id } = req.params;
//         // 2. Adicionamos 'capa' à desestruturação do req.body
//         const { titulo, autor, sinopse, capa } = req.body;

//         // 3. Removemos toda a lógica de 'req.file', 'oldCapaPath' e 'fs.unlinkSync'
//         //    Não precisamos mais verificar o arquivo antigo, pois não estamos salvando arquivos.
        
//         await pool.execute(
//             "UPDATE livros SET titulo = ?, autor = ?, sinopse = ?, capa = ? WHERE id = ?",
//             [titulo, autor, sinopse, capa, id] // Passa a nova URL da capa
//         );

//         res.status(200).json({
//             id: parseInt(id),
//             titulo,
//             autor,
//             sinopse,
//             capa: capa // Retorna a nova URL
//         });

//     } catch (error) {
//         console.error('Erro ao editar o livro:', error);
//         res.status(500).json({ message: 'Erro interno do servidor' });
//     }
// });

router.put('/:id', authMiddleware, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { titulo, autor, sinopse, capa, generos } = req.body;
        
        const pool = await poolPromise;
        connection = await pool.getConnection();
        
        // 1. Inicia a Transação
        await connection.beginTransaction();

        // 2. Atualiza os dados do livro
        await connection.execute(
            "UPDATE livros SET titulo = ?, autor = ?, sinopse = ?, capa = ? WHERE id = ?",
            [titulo, autor, sinopse, capa, id]
        );

        // 3. Deleta os gêneros ANTIGOS
        await connection.execute("DELETE FROM livros_generos WHERE livro_id = ?", [id]);

        // 4. Insere os gêneros NOVOS (se houver)
        if (generos && generos.length > 0) {
            const generosValues = generos.map(generoId => [id, generoId]);
            await connection.query(
                "INSERT INTO livros_generos (livro_id, genero_id) VALUES ?",
                [generosValues]
            );
        }
        
        // 5. Commita a transação
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

// --- (O restante do arquivo: /comments, /rating, /review, /like, /likes) ---
// --- (Nenhuma alteração necessária nessas rotas) ---
// ... (copie o resto do seu arquivo books.js original aqui)
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
                // Precisamos importar o jwt aqui
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