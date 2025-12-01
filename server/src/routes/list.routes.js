const express = require('express');
const router = express.Router();
const listController = require('../controllers/list.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Listas
 *     description: Gerenciamento de listas de leitura
 */

/**
 * @swagger
 * /api/lists:
 *   get:
 *     summary: Retorna todas as listas do usuário logado
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 */
router.get('/', authMiddleware, listController.getMyLists);

/**
 * @swagger
 * /api/lists:
 *   post:
 *     summary: Cria uma nova lista
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *             properties:
 *               nome:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lista criada
 *       409:
 *         description: Nome já existe
 */
router.post('/', authMiddleware, listController.createList);

/**
 * @swagger
 * /api/lists/{listId}:
 *   put:
 *     summary: Renomeia uma lista
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
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
 *               - nome
 *             properties:
 *               nome:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lista atualizada
 */
router.put('/:listId', authMiddleware, listController.updateList);

/**
 * @swagger
 * /api/lists/{listId}:
 *   delete:
 *     summary: Exclui uma lista
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista deletada
 */
router.delete('/:listId', authMiddleware, listController.deleteList);

/**
 * @swagger
 * /api/lists/{listId}/books:
 *   get:
 *     summary: Lista os livros de uma lista
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalhes e livros da lista
 */
router.get('/:listId/books', authMiddleware, listController.getListDetails);

/**
 * @swagger
 * /api/lists/{listId}/books:
 *   post:
 *     summary: Adiciona um livro a uma lista
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
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
 *               - bookId
 *             properties:
 *               bookId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Livro adicionado
 */
router.post('/:listId/books', authMiddleware, listController.addBookToList);

/**
 * @swagger
 * /api/lists/{listId}/books/{bookId}:
 *   delete:
 *     summary: Remove um livro de uma lista
 *     tags: [Listas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Livro removido
 */
router.delete('/:listId/books/:bookId', authMiddleware, listController.removeBookFromList);

module.exports = router;
