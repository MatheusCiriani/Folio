const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prismaClient');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');

exports.register = async (req, res) => {
    // Validação Zod
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ 
            message: "Dados inválidos", 
            errors: validation.error.format() 
        });
    }

    const { nome, email, senha } = validation.data;

    try {
        // Verifica se usuário existe
        const userExists = await prisma.usuario.findUnique({ where: { email } });
        if (userExists) {
            return res.status(409).json({ message: "E-mail já em uso." });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);

        // Cria usuário
        const newUser = await prisma.usuario.create({
            data: {
                nome,
                email,
                senha: hashedPassword
            }
        });

        res.status(201).json({ message: "Usuário criado com sucesso!", usuariosId: newUser.id });
    } catch (error) {
        console.error("Erro no registro:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

exports.login = async (req, res) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: validation.error.format() });
    }

    const { email, senha } = validation.data;

    try {
        const user = await prisma.usuario.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: "Email ou senha inválidos." });
        }

        const isMatch = await bcrypt.compare(senha, user.senha);
        if (!isMatch) {
            return res.status(401).json({ message: "Email ou senha inválidos." });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, nome: user.nome, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: "Login bem-sucedido!",
            token,
            usuarios: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

exports.logout = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const expUnix = req.user.exp;
        const dataExpiracao = new Date(expUnix * 1000);

        // Adiciona à blacklist
        await prisma.tokenBlacklist.create({
            data: {
                token: token,
                data_expiracao: dataExpiracao
            }
        });

        res.status(200).json({ message: 'Logout realizado com sucesso.' });
    } catch (error) {
        // Se o token já estiver na blacklist (P2002 é erro de unique no Prisma)
        if (error.code === 'P2002') {
            return res.status(200).json({ message: 'Usuário já deslogado.' });
        }
        console.error('Erro no logout:', error);
        res.status(500).json({ message: 'Erro interno ao tentar fazer logout.' });
    }
};