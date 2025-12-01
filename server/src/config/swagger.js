// src/config/swagger.js
const swaggerJsDoc = require('swagger-jsdoc');

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Fólio API',
            version: '1.0.0',
            description: 'Documentação da API do projeto Fólio.',
            contact: { name: 'Suporte Fólio', email: 'suporte@folio.com' }
        },
        servers: [
            { url: 'http://localhost:3001', description: 'Servidor Local' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.js'], // <--- ATENÇÃO: Caminho atualizado
};

module.exports = swaggerJsDoc(swaggerOptions);