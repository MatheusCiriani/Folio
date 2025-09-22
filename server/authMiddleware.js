const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Adiciona os dados do usuário (id, email, role) à requisição
        next(); // Continua para a próxima função (a rota)
    } catch (error) {
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