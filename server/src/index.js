// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

// Configs
const prisma = require('./config/prismaClient'); // <--- ADICIONADO: Prisma Client
const swaggerDocs = require('./config/swagger');

// Rotas
const authRoutes = require('./routes/auth.routes');
const bookRoutes = require('./routes/book.routes');
const commentRoutes = require('./routes/comment.routes');
const userRoutes = require('./routes/user.routes');
const listRoutes = require('./routes/list.routes');
const genreRoutes = require('./routes/genre.routes');
const recRoutes = require('./routes/recommendation.routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/recommendations', recRoutes);

const startServer = async () => {
    try {
        // ALTERADO: Usamos o Prisma para testar a conexão
        await prisma.$connect();
        console.log('✅ Banco de dados conectado (Prisma).');
        
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Falha ao iniciar:', error);
        process.exit(1);
    }
};

startServer();