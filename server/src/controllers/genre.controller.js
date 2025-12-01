const prisma = require('../config/prismaClient');

exports.getAll = async (req, res) => {
    try {
        const genres = await prisma.genero.findMany({ orderBy: { nome: 'asc' } });
        res.status(200).json(genres);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};