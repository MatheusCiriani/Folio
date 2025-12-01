const prisma = require('../config/prismaClient');

exports.updateComment = async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const userId = req.user.id;
        const { texto, nota } = req.body;

        // Verifica autor
        const comment = await prisma.comentario.findUnique({ where: { id: commentId } });
        if (!comment) return res.status(404).json({ message: 'Não encontrado.' });
        if (comment.usuario_id !== userId) return res.status(403).json({ message: 'Acesso negado.' });

        // Transaction: Atualiza comentário E avaliação
        await prisma.$transaction([
            prisma.comentario.update({
                where: { id: commentId },
                data: { texto }
            }),
            // Atualiza a nota (precisa achar a avaliação certa baseada em livro/user)
            // Como não temos ID da avaliação direto, usamos updateMany
            prisma.avaliacao.updateMany({
                where: { livro_id: comment.livro_id, usuario_id: userId },
                data: { nota }
            })
        ]);

        res.status(200).json({ message: 'Atualizado.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const userId = req.user.id;

        const comment = await prisma.comentario.findUnique({ where: { id: commentId } });
        if (!comment) return res.status(404).json({ message: 'Já removido.' });
        if (comment.usuario_id !== userId) return res.status(403).json({ message: 'Acesso negado.' });

        await prisma.$transaction([
            prisma.avaliacao.deleteMany({
                where: { livro_id: comment.livro_id, usuario_id: userId }
            }),
            prisma.comentario.delete({ where: { id: commentId } })
        ]);

        res.status(200).json({ message: 'Deletado.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const comentarioId = parseInt(req.params.id);
        const userId = req.user.id;

        // Nota: O Schema atual não tem PK composta para Curtida, mas tem ID.
        // Vamos buscar primeiro.
        const existingLike = await prisma.curtida.findFirst({
            where: { comentario_id: comentarioId, usuario_id: userId }
        });

        if (existingLike) {
            await prisma.curtida.delete({ where: { id: existingLike.id } });
            return res.status(200).json({ liked: false });
        } else {
            await prisma.curtida.create({
                data: { comentario_id: comentarioId, usuario_id: userId }
            });
            return res.status(201).json({ liked: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.getLikes = async (req, res) => {
    try {
        const comentarioId = parseInt(req.params.id);
        const total = await prisma.curtida.count({
            where: { comentario_id: comentarioId }
        });
        
        // userLiked simplificado (se quiser lógica completa, precisa decodificar token aqui ou passar via middleware opcional)
        const userLiked = false; 
        
        res.status(200).json({ totalCurtidas: total, userLiked });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};