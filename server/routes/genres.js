// server/routes/genres.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

// ROTA: Buscar todos os gêneros
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM generos ORDER BY nome ASC");
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar gêneros:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

module.exports = router;