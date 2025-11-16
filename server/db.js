// /Folio/server/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const initializeDatabase = async () => {
    try {
        console.log(`Conectando ao banco de dados: ${process.env.DB_HOST}...`);
        const pool = mysql.createPool(poolConfig);
        const connection = await pool.getConnection();
        console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
        connection.release();
        return pool;
    } catch (error) {
        console.error(`❌ Falha fatal ao conectar ao banco de dados: ${error.message}`);
        process.exit(1);
    }
};

module.exports = initializeDatabase();