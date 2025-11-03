// server/authMiddleware.js
const jwt = require('jsonwebtoken');
const poolPromise = require('./db'); // <<< 1. Renomeie a importação

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const pool = await poolPromise; // <<< 2. Adicione esta linha
        
        // --- VERIFICAÇÃO DA BLACKLIST ---
        // Agora 'pool.execute' vai funcionar
        const [rows] = await pool.execute(
            "SELECT token FROM token_blacklist WHERE token = ?",
            [token]
        );

        if (rows.length > 0) {
            return res.status(401).json({ message: 'Token inválido (logout).' });
        }
        // --- FIM DA VERIFICAÇÃO ---

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next(); 
    } catch (error) {
        // Se a verificação do pool ou do jwt.verify falhar
        console.error("Erro no authMiddleware:", error); // Adicionei este log para te ajudar no futuro
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