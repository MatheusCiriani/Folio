const jwt = require('jsonwebtoken');
const prisma = require('../config/prismaClient'); // <--- ATENÇÃO: Usa Prisma agora

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verifica blacklist usando Prisma
        const blacklisted = await prisma.tokenBlacklist.findUnique({
            where: { token: token }
        });

        if (blacklisted) {
            return res.status(401).json({ message: 'Token inválido (logout).' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next(); 
    } catch (error) {
        console.error("Erro no authMiddleware:", error);
        res.status(400).json({ message: 'Token inválido.' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.email === 'admin@admin.com') {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador.' });
    }
};

module.exports = { authMiddleware, adminMiddleware };