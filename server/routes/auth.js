const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const poolPromise = require('../db'); 
const { authMiddleware } = require('../authMiddleware'); 

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Autenticação
 *     description: Gerenciamento de usuários (Login, Registro, Logout)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Cria uma nova conta de usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *             properties:
 *               nome:
 *                 type: string
 *                 description: Nome completo do usuário
 *               email:
 *                 type: string
 *                 format: email
 *                 description: E-mail para login
 *               senha:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Campos obrigatórios faltando
 *       409:
 *         description: E-mail já está em uso
 *       500:
 *         description: Erro no servidor
 */
router.post('/register', async (req, res) => {
    try {
        const pool = await poolPromise;
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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autentica o usuário e retorna um token JWT
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: teste@email.com
 *               senha:
 *                 type: string
 *                 format: password
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 usuarios:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nome:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Campos faltando
 *       401:
 *         description: Credenciais inválidas
 *       500:
 *         description: Erro no servidor
 */
router.post('/login', async (req, res) => {
    try {
        const pool = await poolPromise;
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

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Realiza logout (invalida o token atual)
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *       401:
 *         description: Token não fornecido ou inválido
 *       500:
 *         description: Erro no servidor
 */
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        const pool = await poolPromise;

        const token = req.headers.authorization.split(' ')[1];
        const expUnix = req.user.exp;
        const dataExpiracao = new Date(expUnix * 1000);

        await pool.execute(
            'INSERT INTO token_blacklist (token, data_expiracao) VALUES (?, ?)',
            [token, dataExpiracao]
        );

        res.status(200).json({ message: 'Logout realizado com sucesso.' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(200).json({ message: 'Usuário já deslogado.' });
        }
        console.error('Erro no logout:', error);
        res.status(500).json({ message: 'Erro interno ao tentar fazer logout.' });
    }
});

module.exports = router;
