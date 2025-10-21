require('dotenv').config(); // Carrega as variáveis do arquivo .env

// --- Importações ---
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db'); // Importa nossa conexão com o banco de dados
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { authMiddleware, adminMiddleware } = require('./authMiddleware'); // Importe o middleware
// --- Configuração do App ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares ---
app.use(cors()); // Permite requisições de diferentes origens (ex: seu app React)
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições

// --- Função para Criar Admin (Seed) ---
// Roda uma única vez na inicialização para garantir que um admin sempre exista
// const createAdminIfNotExists = async () => {
//     try {
//         const adminEmail = process.env.ADMIN_EMAIL;
//         const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [adminEmail]);

//         if (rows.length === 0) {
//             console.log(`Nenhum usuário admin encontrado. Criando admin com email: ${adminEmail}`);
//             const adminNome = process.env.ADMIN_NOME;
//             const adminPassword = process.env.ADMIN_PASSWORD;

//             const hashedPassword = await bcrypt.hash(adminPassword, 10);

//             await pool.execute(
//                 "INSERT INTO users (nome, email, password, role) VALUES (?, ?, ?, ?)",
//                 [adminNome, adminEmail, hashedPassword, 'admin']
//             );
//             console.log('✅ Usuário admin criado com sucesso!');
//         } else {
//             console.log('Usuário admin já existe.' );
//        }
//     } catch (error) {
//         console.error('❌ Erro ao criar usuário admin:', error);
//     }
// };


// --- ROTA: Buscar todos os livros
// Método: GET
// URL: /api/books
app.get('/api/books', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM livros ORDER BY titulo ASC");
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar todos os livros:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Define o diretório onde as imagens serão salvas
const uploadDir = 'uploads/';
// Cria o diretório se ele não existir
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configura o armazenamento dos arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Salva em 'uploads/'
    },
    filename: (req, file, cb) => {
        // Cria um nome de arquivo único para evitar conflitos
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Torna a pasta 'uploads' acessível publicamente para que as imagens possam ser exibidas
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Rotas da API ---

// Rota para exibir os detalhes de um livro pelo ID
// Método: GET
// URL: /api/books/:id
app.get('/api/books/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Executa a query no banco de dados para buscar o livro
        // O nome da tabela 'livros' está correto, conforme seu print
        const [rows] = await pool.execute("SELECT * FROM livros WHERE id = ?", [id]);

        // Verifica se o livro foi encontrado
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Livro não encontrado' });
        }

        const book = rows[0];
        res.status(200).json(book);
    } catch (error) {
        console.error('Erro ao buscar o livro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// NOVO ENDPOINT: Criar um novo livro
// O middleware 'upload.single('capa')' processa o upload de um arquivo do campo 'capa'
app.post('/api/books', authMiddleware, adminMiddleware, upload.single('capa'), async (req, res) => {
    try {
        const { titulo, autor, sinopse } = req.body;

        // Verifica se os campos obrigatórios foram enviados
        if (!titulo || !autor) {
            return res.status(400).json({ message: 'Os campos título e autor são obrigatórios.' });
        }

        // O 'req.file' contém as informações do arquivo que foi enviado
        // Se nenhum arquivo foi enviado, o valor será undefined
        const capaPath = req.file ? req.file.path.replace(/\\/g, "/") : null;

        // Insere o novo livro no banco de dados
        const [result] = await pool.execute(
            "INSERT INTO livros (titulo, autor, sinopse, capa) VALUES (?, ?, ?, ?)",
            [titulo, autor, sinopse, capaPath]
        );

        const newBookId = result.insertId;

        // Retorna o livro recém-criado
        res.status(201).json({
            id: newBookId,
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

// NOVO ENDPOINT: Editar um livro existente
app.put('/api/books/:id', authMiddleware, adminMiddleware, upload.single('capa'), async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, autor, sinopse } = req.body;

        // 1. Verifica se o livro existe
        const [rows] = await pool.execute("SELECT capa FROM livros WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Livro não encontrado' });
        }

        const oldCapaPath = rows[0].capa;
        let capaPath = oldCapaPath; // Mantém a capa antiga por padrão

        // 2. Se uma nova imagem de capa foi enviada, atualiza o caminho
        if (req.file) {
            capaPath = req.file.path.replace(/\\/g, "/");
            // Opcional: deleta a imagem antiga do servidor para não acumular lixo
            if (oldCapaPath && fs.existsSync(oldCapaPath)) {
                fs.unlinkSync(oldCapaPath);
            }
        }

        // 3. Atualiza os dados no banco
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

// --- Rota de Cadastro (Register) ---
app.post('/api/register', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        // 1. Validação dos campos
        if (!nome || !email || !senha) {
            return res.status(400).json({ message: "Por favor, preencha todos os campos." });
        }

        // 2. Criptografa a senha
        const hashedPassword = await bcrypt.hash(senha, 10);

        // 3. Insere o novo usuário no banco de dados
        const [result] = await pool.execute(
            "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
            [nome, email, hashedPassword]
        );

        res.status(201).json({ message: "Usuário criado com sucesso!", usuariosId: result.insertId });

    } catch (error) {
        // 4. Tratamento de erros
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Este e-mail já está em uso." });
        }
        console.error("Erro no registro:", error);
        res.status(500).json({ message: "Erro no servidor ao tentar registrar." });
    }
});

// --- Rota de Login ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        // 1. Validação dos campos
        if (!email || !senha) {
            return res.status(400).json({ message: "Por favor, preencha e-mail e senha." });
        }

        // 2. Busca o usuário pelo e-mail
        // Corrigido para buscar da tabela 'users'
        const [rows] = await pool.execute("SELECT * FROM usuarios WHERE email = ?", [email]);

        if (rows.length === 0) {
            return res.status(401).json({ message: "Email ou senha inválidos." });
        }

        const usuarios = rows[0];

        // 3. Compara a senha enviada com a senha armazenada (hash)
        const isPasswordCorrect = await bcrypt.compare(senha, usuarios.senha);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Email ou senha inválidos." });
        }

        // 4. Gera o Token JWT
        const token = jwt.sign(
            { id: usuarios.id, email: usuarios.email, nome: usuarios.nome, role: usuarios.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expira em 1 hora
        );

        // 5. Envia a resposta de sucesso
        res.status(200).json({
            message: "Login bem-sucedido!",
            token,
            usuarios: {
                id: usuarios.id,
                nome: usuarios.nome,
                email: usuarios.email,
                role: usuarios.role
            }
        });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: "Erro no servidor ao tentar fazer login." });
    }
});

// ...

// ROTA DE COMENTÁRIOS ATUALIZADA PARA INCLUIR A NOTA
app.get('/api/books/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const [comments] = await pool.execute(
            `SELECT 
                c.id, 
                c.texto, 
                c.criado_em,
                c.usuario_id,
                COALESCE(u.nome, 'Usuário Desconhecido') as usuario_nome, 
                (SELECT COUNT(*) FROM curtidas cu WHERE cu.comentario_id = c.id) as curtidas,
                a.nota  /* <<< ADICIONAMOS A NOTA DA AVALIAÇÃO */
            FROM comentarios c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            /* Fazemos o JOIN na tabela de avaliações pelo mesmo usuário E mesmo livro */
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

// ...

// NOVA ROTA: Atualizar (EDITAR) um comentário/avaliação
app.put('/api/comments/:commentId', authMiddleware, async (req, res) => {
    try {
        const { commentId } = req.params;
        const { id: usuario_id } = req.user;
        const { texto, nota } = req.body;

        // 1. Busca o comentário para pegar o livro_id e verificar o dono
        const [rows] = await pool.execute('SELECT * FROM comentarios WHERE id = ?', [commentId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Comentário não encontrado.' });
        }

        const comentario = rows[0];
        if (comentario.usuario_id !== usuario_id) {
            return res.status(403).json({ message: 'Acesso negado. Você não é o autor deste comentário.' });
        }

        // 2. Atualiza o texto do comentário
        await pool.execute('UPDATE comentarios SET texto = ? WHERE id = ?', [texto, commentId]);

        // 3. Atualiza a nota na tabela de avaliações
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


// ROTA: Deletar um comentário/avaliação
app.delete('/api/comments/:commentId', authMiddleware, async (req, res) => {
    try {
        const { commentId } = req.params;
        const { id: usuario_id } = req.user;

        // 1. Busca o comentário para pegar o livro_id e verificar o dono
        const [rows] = await pool.execute('SELECT * FROM comentarios WHERE id = ?', [commentId]);
        if (rows.length === 0) {
            return res.status(200).json({ message: 'Comentário já removido.' });
        }

        const comentario = rows[0];
        if (comentario.usuario_id !== usuario_id) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        // IMPORTANTE: Primeiro deletamos a avaliação, depois o comentário.
        // Se o comentário for deletado primeiro, perdemos a referência para deletar a avaliação.
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

// ROTA DE AVALIAÇÃO ATUALIZADA E ROBUSTA
app.get('/api/books/:id/rating', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.execute(
            // COALESCE garante que, se AVG(nota) for NULL, o valor 0 será retornado no lugar.
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


// NOVA ROTA: Adicionar um comentário e uma avaliação
app.post('/api/books/:id/review', authMiddleware, async (req, res) => {
    try {
        const { id: livro_id } = req.params; // Pega o ID do livro da URL
        const { id: usuario_id } = req.user;   // Pega o ID do usuário do token (via authMiddleware)
        const { texto, nota } = req.body;      // Pega o texto e a nota do corpo da requisição

        // 1. Validação dos dados recebidos
        if (!texto || !nota) {
            return res.status(400).json({ message: 'O texto do comentário e a nota são obrigatórios.' });
        }
        if (nota < 1 || nota > 5) {
            return res.status(400).json({ message: 'A nota deve ser entre 1 e 5.' });
        }

        // 2. Inserir o comentário
        await pool.execute(
            'INSERT INTO comentarios (livro_id, usuario_id, texto) VALUES (?, ?, ?)',
            [livro_id, usuario_id, texto]
        );

        // 3. Inserir OU ATUALIZAR a avaliação
        // Graças ao índice único que criamos, podemos usar ON DUPLICATE KEY UPDATE.
        // Se o usuário já avaliou, apenas atualiza a nota. Se não, insere uma nova.
        await pool.execute(
            'INSERT INTO avaliacoes (livro_id, usuario_id, nota) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nota = ?',
            [livro_id, usuario_id, nota, nota] // A nota é passada duas vezes para o update
        );

        res.status(201).json({ message: 'Avaliação enviada com sucesso!' });

    } catch (error) {
        console.error('Erro ao salvar avaliação:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao salvar avaliação.' });
    }
});

// --- ROTAS DE CURTIDAS ---
// Curtir ou descurtir um livro
app.post('/api/books/:id/like', authMiddleware, async (req, res) => {
    try {
        const { id: livro_id } = req.params;
        const { id: usuario_id } = req.user;

        // Verifica se o usuário já curtiu o livro
        const [rows] = await pool.execute(
            'SELECT * FROM curtidas WHERE usuario_id = ? AND livro_id = ?',
            [usuario_id, livro_id]
        );

        if (rows.length > 0) {
            // Já curtiu -> remove (descurte)
            await pool.execute('DELETE FROM curtidas WHERE usuario_id = ? AND livro_id = ?', [usuario_id, livro_id]);
            return res.status(200).json({ liked: false, message: 'Curtida removida.' });
        } else {
            // Não curtiu -> insere
            await pool.execute('INSERT INTO curtidas (usuario_id, livro_id) VALUES (?, ?)', [usuario_id, livro_id]);
            return res.status(201).json({ liked: true, message: 'Livro curtido com sucesso!' });
        }
    } catch (error) {
        console.error('Erro ao curtir livro:', error);
        res.status(500).json({ message: 'Erro interno ao curtir livro.' });
    }
});
// Curtir ou descurtir um comentário
app.post('/api/comments/:id/like', authMiddleware, async (req, res) => {
    try {
        const { id: comentario_id } = req.params;
        const { id: usuario_id } = req.user;

        // Verifica se o usuário já curtiu o comentário
        const [rows] = await pool.execute(
            'SELECT * FROM curtidas WHERE usuario_id = ? AND comentario_id = ?',
            [usuario_id, comentario_id]
        );

        if (rows.length > 0) {
            // Já curtiu -> remove
            await pool.execute('DELETE FROM curtidas WHERE usuario_id = ? AND comentario_id = ?', [usuario_id, comentario_id]);
            return res.status(200).json({ liked: false, message: 'Curtida removida.' });
        } else {
            // Ainda não curtiu -> insere
            await pool.execute('INSERT INTO curtidas (usuario_id, comentario_id) VALUES (?, ?)', [usuario_id, comentario_id]);
            return res.status(201).json({ liked: true, message: 'Comentário curtido com sucesso!' });
        }
    } catch (error) {
        console.error('Erro ao curtir comentário:', error);
        res.status(500).json({ message: 'Erro interno ao curtir comentário.' });
    }
});

// --- NOVAS ROTAS: SEGUIR USUÁRIO (FOLLOW) ---

// Rota para um usuário logado começar a seguir outro usuário
// Método: POST
// URL: /api/users/:followingId/follow
app.post('/api/users/:followingId/follow', authMiddleware, async (req, res) => {
    try {
        // Pega o ID do usuário logado (o seguidor) a partir do middleware
        const followerId = req.user.id; 
        // Pega o ID do usuário a ser seguido a partir dos parâmetros da URL
        const { followingId } = req.params; 

        // 1. Validação: Não pode seguir a si mesmo
        if (parseInt(followerId) === parseInt(followingId)) {
            return res.status(400).json({ message: "Você não pode seguir a si mesmo." });
        }
        
        // 2. Validação: Checar se o usuário a ser seguido existe (melhora a experiência de erro)
        const [userRows] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [followingId]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: "Usuário a ser seguido não encontrado." });
        }

        // 3. Verifica se o follow já existe
        const [followRows] = await pool.execute(
            'SELECT * FROM seguir WHERE usuario_id_seguidor = ? AND usuario_id_seguido = ?',
            [followerId, followingId]
        );

        if (followRows.length > 0) {
            return res.status(409).json({ message: "Você já segue este usuário." });
        }

        // 4. Cria o registro de follow na nova tabela 'seguir'
        await pool.execute(
            'INSERT INTO seguir (usuario_id_seguidor, usuario_id_seguido) VALUES (?, ?)',
            [followerId, followingId]
        );

        res.status(201).json({ message: "Usuário seguido com sucesso!" });

    } catch (error) {
        console.error('Erro ao seguir usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao seguir usuário.' });
    }
});

// Rota para um usuário logado parar de seguir outro usuário
// Método: DELETE
// URL: /api/users/:followingId/follow
app.delete('/api/users/:followingId/follow', authMiddleware, async (req, res) => {
    try {
        const followerId = req.user.id; // ID do usuário logado (o seguidor)
        const { followingId } = req.params; // ID do usuário a ser deixado de seguir

        // 1. Tenta deletar o registro de follow
        const [result] = await pool.execute(
            'DELETE FROM seguir WHERE usuario_id_seguidor = ? AND usuario_id_seguido = ?',
            [followerId, followingId]
        );

        // 2. Verifica se algum registro foi deletado
        if (result.affectedRows === 0) {
            // Retorna 404 se a relação não existia para ser deletada
            return res.status(404).json({ message: "Você não seguia este usuário." });
        }

        res.status(200).json({ message: "Usuário deixado de seguir com sucesso." });

    } catch (error) {
        console.error('Erro ao deixar de seguir usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao deixar de seguir usuário.' });
    }
});

// --- NOVAS ROTAS: INDICAÇÃO DE LIVROS ---

// Rota para um usuário logado indicar um livro para outro usuário
// Método: POST
// URL: /api/recommendations
app.post('/api/recommendations', authMiddleware, async (req, res) => {
    try {
        const usuario_origem_id = req.user.id; // Usuário logado é quem envia a indicação
        
        // Dados esperados no corpo da requisição (req.body):
        const { livro_id, usuario_destino_id } = req.body; 

        // 1. Validação: Campos obrigatórios
        if (!livro_id || !usuario_destino_id) {
            return res.status(400).json({ message: "O ID do livro e o ID do destinatário são obrigatórios." });
        }

        // 2. Validação: Não pode indicar para si mesmo
        if (parseInt(usuario_origem_id) === parseInt(usuario_destino_id)) {
            return res.status(400).json({ message: "Você não pode indicar um livro para si mesmo." });
        }
        
        // 3. (Opcional, mas recomendado) Verificar se o livro e o usuário destino existem
        const [livroRows] = await pool.execute('SELECT id FROM livros WHERE id = ?', [livro_id]);
        if (livroRows.length === 0) {
            return res.status(404).json({ message: "Livro não encontrado." });
        }

        const [destinoRows] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [usuario_destino_id]);
        if (destinoRows.length === 0) {
            return res.status(404).json({ message: "Usuário destinatário não encontrado." });
        }

        // 4. Inserir a indicação na tabela 'indicacoes'
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

// Rota para listar as indicações de livros recebidas pelo usuário logado
// Método: GET
// URL: /api/recommendations/received
app.get('/api/recommendations/received', authMiddleware, async (req, res) => {
    try {
        const usuario_destino_id = req.user.id; // Usuário logado é o destinatário

        // 1. Busca as indicações recebidas, fazendo JOIN com as tabelas de livros e usuários
        const [rows] = await pool.execute(
            `SELECT 
                i.id AS indicacao_id, 
                i.criado_em,
                l.id AS livro_id, 
                l.titulo AS livro_titulo,
                l.autor AS livro_autor,
                u.id AS origem_id,
                u.nome AS origem_nome
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

// Obter total de curtidas de um comentário
app.get('/api/comments/:id/likes', async (req, res) => {
    try {
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

// Obter total de curtidas de um livro (retorna também se o usuário atual curtiu, caso envie token)
app.get('/api/books/:id/likes', async (req, res) => {
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
                // token inválido -> ignorar e retornar apenas o total
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

// ... (resto do arquivo)

// --- Iniciar o Servidor ---
app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    // Após o servidor iniciar, verifica e cria o usuário admin se necessário
    // await createAdminIfNotExists();
});
