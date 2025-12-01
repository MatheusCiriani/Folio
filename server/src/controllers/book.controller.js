const prisma = require('../config/prismaClient');
const { bookSchema, reviewSchema } = require('../schemas/book.schema');

exports.getAllBooks = async (req, res) => {
    try {
        const { genre, search, excludeListId } = req.query;
        
        // Filtros dinâmicos do Prisma
        const where = {};

        // 1. Filtro por Gênero
        if (genre) {
            where.generos = {
                some: { genero_id: parseInt(genre) }
            };
        }

        // 2. Filtro por Busca (Título ou Autor)
        if (search) {
            where.OR = [
                { titulo: { contains: search } }, // mysql padrão é case-insensitive
                { autor: { contains: search } }
            ];
        }

        // 3. Filtro para excluir livros de uma lista
        if (excludeListId) {
            where.listas = {
                none: { lista_id: parseInt(excludeListId) }
            };
        }

        const books = await prisma.livro.findMany({
            where: where,
            take: search ? 10 : undefined, // Limita se for busca
            orderBy: { titulo: 'asc' }
        });

        res.status(200).json(books);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.getBookById = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await prisma.livro.findUnique({
            where: { id: parseInt(id) },
            include: {
                generos: {
                    include: {
                        genero: true // Traz o nome do gênero
                    }
                }
            }
        });

        if (!book) return res.status(404).json({ message: 'Livro não encontrado' });

        // Formata para ficar igual ao que o frontend espera
        const formattedBook = {
            ...book,
            generos: book.generos.map(g => ({ id: g.genero.id, nome: g.genero.nome }))
        };

        res.status(200).json(formattedBook);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.createBook = async (req, res) => {
    const validation = bookSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.format() });

    const { titulo, autor, sinopse, capa, generos } = validation.data;

    try {
        const newBook = await prisma.livro.create({
            data: {
                titulo,
                autor,
                sinopse,
                capa,
                // Criação dos relacionamentos na tabela pivô
                generos: {
                    create: generos?.map(generoId => ({
                        genero: { connect: { id: generoId } }
                    }))
                }
            }
        });

        // Retorna o formato esperado, incluindo IDs dos gêneros
        res.status(201).json({ ...newBook, generos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.updateBook = async (req, res) => {
    const { id } = req.params;
    const validation = bookSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.format() });

    const { titulo, autor, sinopse, capa, generos } = validation.data;

    try {
        // Transaction automática do Prisma
        const updatedBook = await prisma.livro.update({
            where: { id: parseInt(id) },
            data: {
                titulo, autor, sinopse, capa,
                generos: {
                    deleteMany: {}, // Apaga relações antigas
                    create: generos?.map(generoId => ({ // Cria novas
                        genero: { connect: { id: generoId } }
                    }))
                }
            }
        });

        res.status(200).json({ ...updatedBook, generos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.addReview = async (req, res) => {
    const { id } = req.params; // Livro ID
    const userId = req.user.id;
    
    const validation = reviewSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.format() });
    const { texto, nota } = validation.data;

    try {
        // Transação para criar comentário e atualizar/criar avaliação
        await prisma.$transaction([
            prisma.comentario.create({
                data: {
                    livro_id: parseInt(id),
                    usuario_id: userId,
                    texto
                }
            }),
            // Upsert: Cria se não existir, atualiza se existir
            // Nota: O Prisma precisa de uma chave única composta para upsert. 
            // Como não definimos @@id([livro_id, usuario_id]) no schema da Avaliação,
            // faremos delete + create ou lógica manual. 
            // Para simplificar e manter compatibilidade com seu SQL anterior:
            prisma.avaliacao.deleteMany({
                where: { livro_id: parseInt(id), usuario_id: userId }
            }),
            prisma.avaliacao.create({
                data: { livro_id: parseInt(id), usuario_id: userId, nota }
            })
        ]);

        res.status(201).json({ message: 'Avaliação enviada!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.getComments = async (req, res) => {
    try {
        const { id } = req.params;
        const comments = await prisma.comentario.findMany({
            where: { livro_id: parseInt(id) },
            orderBy: { criado_em: 'desc' },
            include: {
                usuario: { select: { id: true, nome: true } },
                curtidas: true // Para contar
            }
        });

        // Precisamos buscar a nota que esse usuário deu para esse livro
        // Isso é complexo de fazer em uma query só no Prisma sem raw query, 
        // então faremos um map ou uma segunda busca.
        
        // Vamos buscar todas as avaliações deste livro para cruzar dados
        const avaliacoes = await prisma.avaliacao.findMany({
            where: { livro_id: parseInt(id) }
        });

        const formattedComments = comments.map(c => {
            const avaliacaoUser = avaliacoes.find(a => a.usuario_id === c.usuario_id);
            return {
                id: c.id,
                texto: c.texto,
                criado_em: c.criado_em,
                usuario_id: c.usuario_id,
                usuario_nome: c.usuario?.nome || 'Usuário Desconhecido',
                curtidas: c.curtidas.length,
                nota: avaliacaoUser ? avaliacaoUser.nota : null
            };
        });

        res.status(200).json(formattedComments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const livro_id = parseInt(req.params.id);
        const usuario_id = req.user.id;

        const existingLike = await prisma.curtida.findFirst({
            where: { livro_id, usuario_id }
        });

        if (existingLike) {
            await prisma.curtida.delete({ where: { id: existingLike.id } });
            return res.status(200).json({ liked: false });
        } else {
            await prisma.curtida.create({ data: { livro_id, usuario_id } });
            return res.status(201).json({ liked: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.getLikes = async (req, res) => {
    try {
        const livro_id = parseInt(req.params.id);
        
        const totalCurtidas = await prisma.curtida.count({
            where: { livro_id }
        });

        let userLiked = false;
        
        // Verifica token manualmente se presente (igual ao seu código anterior)
        const authHeader = req.headers.authorization;
        if (authHeader) {
            // ... lógica de token decoding aqui se quiser manter igual
            // Mas idealmente isso viria do middleware se a rota fosse autenticada.
            // Para manter compatibilidade com sua rota pública:
            const jwt = require('jsonwebtoken');
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const count = await prisma.curtida.count({
                    where: { livro_id, usuario_id: decoded.id }
                });
                userLiked = count > 0;
            } catch (e) {}
        }

        res.status(200).json({ totalCurtidas, userLiked });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};

exports.getRating = async (req, res) => {
    try {
        const livro_id = parseInt(req.params.id);
        const aggregations = await prisma.avaliacao.aggregate({
            where: { livro_id },
            _avg: { nota: true },
            _count: { nota: true }
        });

        res.status(200).json({
            media_avaliacoes: aggregations._avg.nota || 0,
            total_avaliacoes: aggregations._count.nota || 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno' });
    }
};