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
    queueLimit: 0
});

module.exports = pool;