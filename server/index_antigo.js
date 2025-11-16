require('dotenv').config();

// --- Importações Principais ---
const express = require('express');
const cors = require('cors');
const path = require('path');
const { uploadDir } = require('./config/multer'); // Importa o diretório de uploads
const dbPoolPromise = require('./db');

// --- Importação das Rotas ---
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const commentRoutes = require('./routes/comments');
const userRoutes = require('./routes/users');
const recommendationRoutes = require('./routes/recommendations');
const genreRoutes = require('./routes/genres');
const listRoutes = require('./routes/lists');

// --- Configuração do App ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares Globais ---
app.use(cors());
app.use(express.json());

// Torna a pasta 'uploads' acessível publicamente
app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

// --- Montagem das Rotas da API ---
// O Express vai direcionar qualquer requisição que comece com:
// '/api/auth' -> para o arquivo authRoutes
// '/api/books' -> para o arquivo bookRoutes
// etc.
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recommendations', recommendationRoutes);


// --- Função para Criar Admin (Seed) ---
// (Deixei aqui, pois é parte da inicialização do app, mas pode ser movido também)
// const createAdminIfNotExists = async (pool) => {
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

const startServer = async () =>{
    try {
        console.log('Aguardando conexão com o banco de dados..')
        const pool = await  dbPoolPromise;
        console.log('✅ Banco de dados pronto para uso.');
    
        // 2. Monta as Rotas da API
        app.use('/api/auth', authRoutes);
        app.use('/api/books', bookRoutes);
        app.use('/api/comments', commentRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/recommendations', recommendationRoutes);
        app.use('/api/genres', genreRoutes);
        app.use('/api/lists', listRoutes);
    
        // 3. Iniciar o Servidor ---
        app.listen(PORT, async () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            // await createAdminIfNotExists(pool);
        });
    } catch (error){
        console.error("❌ Falha fatal ao iniciar o servidor:", error);
    }
}

// --- Iniciar o Servidor ---
startServer();