const prisma = require('../config/prismaClient');
const { recommendationSchema } = require('../schemas/recommendation.schema');

exports.create = async (req, res) => {
    const validation = recommendationSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.format() });

    const { livro_id, usuario_destino_id } = validation.data;
    const usuario_origem_id = req.user.id;

    if (usuario_origem_id === usuario_destino_id) return res.status(400).json({ message: "Não pode indicar para si mesmo." });

    try {
        const newRec = await prisma.indicacao.create({
            data: {
                livro_id,
                usuario_origem_id,
                usuario_destino_id
            }
        });
        res.status(201).json({ message: "Indicado!", id: newRec.id });
    } catch (error) {
        if (error.code === 'P2003') return res.status(404).json({ message: "Livro ou Usuário não encontrado." });
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.getReceived = async (req, res) => {
    try {
        const recs = await prisma.indicacao.findMany({
            where: { usuario_destino_id: req.user.id },
            include: {
                livro: { select: { id: true, titulo: true, autor: true } },
                origem: { select: { id: true, nome: true } }
            },
            orderBy: { criado_em: 'desc' }
        });

        // Formatar resposta
        const formatted = recs.map(r => ({
            indicacao_id: r.id,
            criado_em: r.criado_em,
            livro_id: r.livro.id,
            livro_titulo: r.livro.titulo,
            livro_autor: r.livro.autor,
            origem_id: r.origem.id,
            origem_nome: r.origem.nome
        }));

        res.status(200).json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};