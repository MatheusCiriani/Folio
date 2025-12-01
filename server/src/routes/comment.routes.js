const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Comentários
 *     description: Gerenciamento de comentários e avaliações
 */

/**
 * @swagger
 * /api/comments/{commentId}:
 *   put:
 *     summary: Atualiza um comentário e a nota
 *     tags:
 *       - Comentários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
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
 *                 type: integer
 *     responses:
 *       200:
 *         description: Atualizado com sucesso
 */
router.put('/:commentId', authMiddleware, commentController.updateComment);

/**
 * @swagger
 * /api/comments/{commentId}:
 *   delete:
 *     summary: Remove um comentário
 *     tags:
 *       - Comentários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deletado com sucesso
 */
router.delete('/:commentId', authMiddleware, commentController.deleteComment);

/**
 * @swagger
 * /api/comments/{id}/like:
 *   post:
 *     summary: Curte ou descurte um comentário
 *     tags:
 *       - Comentários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do comentário
 *     responses:
 *       200:
 *         description: Curtida removida
 *       201:
 *         description: Curtida adicionada
 */
router.post('/:id/like', authMiddleware, commentController.toggleLike);

/**
 * @swagger
 * /api/comments/{id}/likes:
 *   get:
 *     summary: Obtém total de curtidas de um comentário
 *     tags:
 *       - Comentários
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contagem retornada
 */
router.get('/:id/likes', commentController.getLikes);

module.exports = router;
