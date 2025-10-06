// server/authMiddleware.js

const jwt = require('jsonwebtoken');

// Middleware para verificar o token JWT e autenticar o usuário
const protect = (req, res, next) => {
    let token;

    // 1. Verifica se o token está presente no cabeçalho Authorization
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Pega o token da string: "Bearer [token]"
            token = req.headers.authorization.split(' ')[1];

            // 2. Decodifica e verifica o token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // 3. Anexa o usuário decodificado à requisição
            // O objeto 'decoded' contém { id, email, nome, role } que você definiu no login
            req.usuario = decoded; 

            next(); // Prossegue para o próximo middleware/função da rota
        } catch (error) {
            console.error('Erro na verificação do token:', error);
            // Token inválido (expirado, modificado, etc.)
            res.status(401).json({ message: 'Não autorizado, token falhou.' });
        }
    }

    // Se não houver token no cabeçalho
    if (!token) {
        res.status(401).json({ message: 'Não autorizado, nenhum token.' });
    }
};

module.exports = { protect };