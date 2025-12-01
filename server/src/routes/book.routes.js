const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Livros
 *     description: Gerenciamento de livros
 */

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Retorna uma lista de livros
 *     tags: [Livros]
 *     responses:
 *       200:
 *         description: Lista de livros retornada com sucesso
 */
router.get('/', bookController.getAllBooks);

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Retorna os detalhes de um livro específico
 *     tags: [Livros]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalhes do livro retornados com sucesso
 *       404:
 *         description: Livro não encontrado
 */
router.get('/:id', bookController.getBookById);

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Cria um novo livro
 *     tags: [Livros]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - autor
 *             properties:
 *               titulo:
 *                 type: string
 *               autor:
 *                 type: string
 *               sinopse:
 *                 type: string
 *               capa:
 *                 type: string
 *               generos:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Livro criado com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post('/', authMiddleware, bookController.createBook);

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Atualiza um livro existente
 *     tags: [Livros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               autor:
 *                 type: string
 *               sinopse:
 *                 type: string
 *               capa:
 *                 type: string
 *               generos:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Livro atualizado com sucesso
 *       404:
 *         description: Livro não encontrado
 */
router.put('/:id', authMiddleware, bookController.updateBook);

/**
 * @swagger
 * /api/books/{id}/comments:
 *   get:
 *     summary: Retorna os comentários de um livro
 *     tags: [Livros]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comentários retornados com sucesso
 */
router.get('/:id/comments', bookController.getComments);

/**
 * @swagger
 * /api/books/{id}/review:
 *   post:
 *     summary: Adiciona uma avaliação ao livro
 *     tags: [Livros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - texto
 *               - nota
 *             properties:
 *               texto:
 *                 type: string
 *               nota:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Avaliação adicionada com sucesso
 */
router.post('/:id/review', authMiddleware, bookController.addReview);

/**
 * @swagger
 * /api/books/{id}/like:
 *   post:
 *     summary: Alterna like no livro
 *     tags: [Livros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Like/deslike realizado
 */
router.post('/:id/like', authMiddleware, bookController.toggleLike);

/**
 * @swagger
 * /api/books/{id}/likes:
 *   get:
 *     summary: Retorna a quantidade de likes do livro
 *     tags: [Livros]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Quantidade de likes retornada
 */
router.get('/:id/likes', bookController.getLikes);

/**
 * @swagger
 * /api/books/{id}/rating:
 *   get:
 *     summary: Retorna a nota média do livro
 *     tags: [Livros]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Média das avaliações retornada
 */
router.get('/:id/rating', bookController.getRating);

module.exports = router;
