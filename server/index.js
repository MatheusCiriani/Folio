// server/index.js
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
const { protect } = require('./authMiddleware');

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
//             console.log('Usuário admin já existe.');
//         }
//     } catch (error) {
//         console.error('❌ Erro ao criar usuário admin:', error);
//     }
// };

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
app.post('/api/books', upload.single('capa'), async (req, res) => {
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
app.put('/api/books/:id', upload.single('capa'), async (req, res) => {
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

// --- ROTAS DE COMENTÁRIOS ---

// Endpoint: Enviar/Criar um novo comentário
// Método: POST
// URL: /api/comentarios
app.post('/api/comentarios', protect, async (req, res) => {
    try {
        // Agora você pode usar req.usuario.id, que é o usuário logado
        const usuario_id = req.usuario.id; 
        const { livro_id, texto } = req.body; 

        // Validação básica (usuario_id já veio do token)
        if (!livro_id || !texto) {
            return res.status(400).json({ 
                message: 'Os campos livro_id e texto são obrigatórios.' 
            });
        }

        const query = 'INSERT INTO comentarios (livro_id, usuario_id, texto) VALUES (?, ?, ?)';
        
        const [result] = await pool.execute(query, [livro_id, usuario_id, texto]);

        res.status(201).json({
            message: 'Comentário criado com sucesso!',
            id: result.insertId,
            livro_id,
            usuario_id,
            texto
        });

    } catch (error) {
        console.error('Erro ao criar o comentário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao criar o comentário.' });
    }
});

// Endpoint: Recuperar todos os comentários de um livro
// Método: GET
// URL: /api/comentarios/livro/:livro_id
app.get('/api/comentarios/livro/:livro_id', async (req, res) => {
    try {
        const { livro_id } = req.params;

        // Query que busca comentários do livro_id, e ordena do mais novo para o mais antigo.
        // O JOIN é opcional, mas útil para trazer o nome do usuário junto.
        const query = `
            SELECT 
                c.id, 
                c.texto, 
                c.criado_em, 
                u.nome AS usuario_nome, 
                u.id AS usuario_id 
            FROM comentarios c
            JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.livro_id = ?
            ORDER BY c.criado_em ASC;
        `;

        const [rows] = await pool.execute(query, [livro_id]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar comentários.' });
    }
});

// Endpoint: Excluir um comentário
// Adicione 'protect'
app.delete('/api/comentarios/:id', protect, async (req, res) => { // <-- AQUI!
    try {
        const { id } = req.params;
        const usuario_logado_id = req.usuario.id; // ID do usuário que está tentando deletar
        
        // 1. Verifica se o usuário logado é o autor do comentário
        const [rows] = await pool.execute(
            "SELECT usuario_id FROM comentarios WHERE id = ?", 
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Comentário não encontrado.' });
        }

        const autor_comentario_id = rows[0].usuario_id;
        
        // **LÓGICA DE AUTORIZAÇÃO**
        if (autor_comentario_id !== usuario_logado_id) {
            // Você também pode adicionar uma checagem de role se tiver 'admin'
            return res.status(403).json({ message: 'Você não tem permissão para excluir este comentário.' });
        }
        
        // 2. Se a permissão for concedida, executa a exclusão
        const query = 'DELETE FROM comentarios WHERE id = ?';
        const [result] = await pool.execute(query, [id]);

        // O 204 é retornado se a exclusão for bem-sucedida
        res.status(204).send(); 

    } catch (error) {
        console.error('Erro ao excluir o comentário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao excluir o comentário.' });
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


// --- Iniciar o Servidor ---
app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    // Após o servidor iniciar, verifica e cria o usuário admin se necessário
    // await createAdminIfNotExists();
});