const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // <-- Atenção ao '../' para voltar um diretório
const { authMiddleware } = require('../authMiddleware'); // Importe o authMiddleware

const router = express.Router();

// --- Rota de Cadastro (Register) ---
// Caminho original: /api/register
// Novo caminho: /register (pois /api/auth já está no index.js)
router.post('/register', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ message: "Por favor, preencha todos os campos." });
        }
        const hashedPassword = await bcrypt.hash(senha, 10);
        const [result] = await pool.execute(
            "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
            [nome, email, hashedPassword]
        );
        res.status(201).json({ message: "Usuário criado com sucesso!", usuariosId: result.insertId });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Este e-mail já está em uso." });
        }
        console.error("Erro no registro:", error);
        res.status(500).json({ message: "Erro no servidor ao tentar registrar." });
    }
});

// --- Rota de Login ---
// Caminho original: /api/login
// Novo caminho: /login
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ message: "Por favor, preencha e-mail e senha." });
        }
        const [rows] = await pool.execute("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (rows.length === 0) {
            return res.status(401).json({ message: "Email ou senha inválidos." });
        }
        const usuarios = rows[0];
        const isPasswordCorrect = await bcrypt.compare(senha, usuarios.senha);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Email ou senha inválidos." });
        }
        const token = jwt.sign(
            { id: usuarios.id, email: usuarios.email, nome: usuarios.nome, role: usuarios.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
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


// --- Rota de Logout ---
// Caminho: POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        // 1. Pega o token do header (o mesmo que o authMiddleware usou)
        const token = req.headers.authorization.split(' ')[1];

        // 2. Pega a data de expiração de dentro do token
        // O req.user foi adicionado pelo authMiddleware e contém os dados do token (incluindo 'exp')
        const expUnix = req.user.exp;
        const dataExpiracao = new Date(expUnix * 1000); // Converte de UNIX timestamp para Data

        // 3. Insere o token na blacklist
        await pool.execute(
            'INSERT INTO token_blacklist (token, data_expiracao) VALUES (?, ?)',
            [token, dataExpiracao]
        );

        res.status(200).json({ message: 'Logout realizado com sucesso.' });

    } catch (error) {
        // Trata o caso de o token já estar na blacklist (erro de chave primária)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(200).json({ message: 'Usuário já deslogado.' });
        }
        console.error('Erro no logout:', error);
        res.status(500).json({ message: 'Erro interno ao tentar fazer logout.' });
    }
});

module.exports = router; // Exporta o roteador