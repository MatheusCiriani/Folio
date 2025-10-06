// server/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,       // Lê do .env
    user: process.env.DB_USER,       // Lê do .env
    password: process.env.DB_PASSWORD, // Lê do .env
    database: process.env.DB_NAME,   // Lê do .env
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    acquireTimeout: 20000, 
    // Define um limite de tempo para conexões inativas (se for suportado pelo seu servidor)
    // Se o seu servidor tiver um timeout de 30 segundos, coloque 25.
    idleTimeout: 25000 
});

module.exports = pool;