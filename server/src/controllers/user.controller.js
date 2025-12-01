const prisma = require('../config/prismaClient');
const { updateUserSchema } = require('../schemas/user.schema');

exports.getMe = async (req, res) => {
    try {
        const user = await prisma.usuario.findUnique({
            where: { id: req.user.id },
            select: { id: true, nome: true, email: true, criado_em: true }
        });
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

exports.updateMe = async (req, res) => {
    const validation = updateUserSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.format() });

    try {
        const updatedUser = await prisma.usuario.update({
            where: { id: req.user.id },
            data: { nome: validation.data.nome },
            select: { id: true, nome: true, email: true }
        });
        res.status(200).json({ message: 'Perfil atualizado!', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

exports.getFollowing = async (req, res) => {
    try {
        const following = await prisma.seguir.findMany({
            where: { usuario_seguidor_id: req.user.id },
            include: { seguido: { select: { id: true, nome: true } } },
            orderBy: { seguido: { nome: 'asc' } }
        });
        // Formata para devolver apenas os dados do usuário seguido
        const formatted = following.map(item => item.seguido);
        res.status(200).json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

exports.getPublicProfile = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const loggedInUserId = req.user.id;

        const user = await prisma.usuario.findUnique({
            where: { id: userId },
            select: { id: true, nome: true, email: true }
        });

        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

        // Verifica se segue
        const isFollowing = await prisma.seguir.findUnique({
            where: {
                usuario_seguidor_id_usuario_seguido_id: {
                    usuario_seguidor_id: loggedInUserId,
                    usuario_seguido_id: userId
                }
            }
        });

        if (user.id !== loggedInUserId) delete user.email;

        res.status(200).json({ ...user, isFollowing: !!isFollowing });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

exports.getLikedBooks = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const likedBooks = await prisma.curtida.findMany({
            where: { usuario_id: userId, livro_id: { not: null } },
            include: { livro: { select: { id: true, titulo: true, capa: true } } },
            orderBy: { criado_em: 'desc' },
            take: 5
        });

        const formatted = likedBooks.map(like => ({
            ...like.livro,
            data_curtida: like.criado_em
        }));

        res.status(200).json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

exports.getPublicLists = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const lists = await prisma.listaUsuario.findMany({
            where: { usuario_id: userId },
            include: {
                _count: { select: { livros: true } } // Conta quantos livros tem na lista
            },
            orderBy: { nome: 'asc' }
        });

        const formatted = lists.map(list => ({
            id: list.id,
            nome: list.nome,
            total_livros: list._count.livros
        }));

        res.status(200).json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

exports.followUser = async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = parseInt(req.params.followingId);

        if (followerId === followingId) return res.status(400).json({ message: 'Não pode seguir a si mesmo.' });

        // Tenta criar (vai falhar se já existir por causa da PK composta)
        await prisma.seguir.create({
            data: {
                usuario_seguidor_id: followerId,
                usuario_seguido_id: followingId
            }
        });

        res.status(201).json({ message: 'Usuário seguido!' });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ message: 'Já segue este usuário.' });
        if (error.code === 'P2003') return res.status(404).json({ message: 'Usuário não encontrado.' });
        console.error(error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

exports.unfollowUser = async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = parseInt(req.params.followingId);

        await prisma.seguir.delete({
            where: {
                usuario_seguidor_id_usuario_seguido_id: {
                    usuario_seguidor_id: followerId,
                    usuario_seguido_id: followingId
                }
            }
        });

        res.status(200).json({ message: "Deixou de seguir." });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ message: "Você não seguia este usuário." });
        console.error(error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};