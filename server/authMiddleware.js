const jwt = require('jsonwebtoken');
const pool = require('./db'); // <-- Importe o pool do banco de dados

const authMiddleware = async (req, res, next) => { // <-- Transforme em 'async'
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // --- NOVO: VERIFICAÇÃO DA BLACKLIST ---
        // Implementa a lógica do PDF [cite: 75-77] usando o banco de dados 
        const [rows] = await pool.execute(
            "SELECT token FROM token_blacklist WHERE token = ?",
            [token]
        );

        // Se o token foi encontrado na blacklist, ele é inválido.
        if (rows.length > 0) {
            return res.status(401).json({ message: 'Token inválido (logout).' });
        }
        // --- FIM DA VERIFICAÇÃO ---

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next(); 
    } catch (error) {
        // Trata tokens expirados ou malformados
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