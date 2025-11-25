// /Folio/server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dbPoolPromise = require('./db'); // Importa a promessa do db.js
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

// Importação das Rotas
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const commentRoutes = require('./routes/comments');
const userRoutes = require('./routes/users');
const recommendationRoutes = require('./routes/recommendations');
const genreRoutes = require('./routes/genres');
const listRoutes = require('./routes/lists');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração das opções do Swagger
const swaggerOptions = {
    definition: {
        openapi: '3.0.0', // Versão do OpenAPI
        info: {
            title: 'Fólio API',
            version: '1.0.0',
            description: 'Documentação da API do projeto Fólio para gerenciamento de livros.',
            contact: {
                name: 'Suporte Fólio',
                email: 'suporte@folio.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3001', // Ajuste a porta conforme seu .env
                description: 'Servidor Local'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{
            bearerAuth: []
        }],
    },
    // Caminho para os arquivos que contêm as anotações (suas rotas)
    apis: ['./routes/*.js'], 
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Rota para servir a documentação
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const startServer = async () => {
    try {
        // Garante que o pool do DB esteja pronto
        await dbPoolPromise;
        console.log('Pool do banco de dados está pronto para uso.');

        // Montagem das Rotas da API
        app.use('/api/auth', authRoutes);
        app.use('/api/books', bookRoutes);
        app.use('/api/comments', commentRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/recommendations', recommendationRoutes);
        app.use('/api/genres', genreRoutes);
        app.use('/api/lists', listRoutes);

        // Iniciar o Servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
        });

    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error);
        process.exit(1);
    }
};

startServer();