const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Usuários
 *     description: Gerenciamento de perfis e relacionamentos
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Retorna os dados do perfil do usuário logado
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do perfil recuperados
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/me', authMiddleware, userController.getMe);

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Atualiza os dados do perfil do usuário logado
 *     tags: [Usuários]
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
 *       200:
 *         description: Perfil atualizado
 *       400:
 *         description: Dados inválidos
 */
router.put('/me', authMiddleware, userController.updateMe);

/**
 * @swagger
 * /api/users/me/following:
 *   get:
 *     summary: Retorna a lista de usuários que você segue
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de seguidos
 */
router.get('/me/following', authMiddleware, userController.getFollowing);

/**
 * @swagger
 * /api/users/{userId}/profile:
 *   get:
 *     summary: Obtém dados públicos do perfil de outro usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Perfil público retornado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:userId/profile', authMiddleware, userController.getPublicProfile);

/**
 * @swagger
 * /api/users/{userId}/liked-books:
 *   get:
 *     summary: Retorna os últimos 5 livros curtidos por um usuário
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de livros curtidos
 */
router.get('/:userId/liked-books', userController.getLikedBooks);

/**
 * @swagger
 * /api/users/{userId}/lists:
 *   get:
 *     summary: Retorna todas as listas públicas de um usuário
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listas recuperadas
 */
router.get('/:userId/lists', userController.getPublicLists);

/**
 * @swagger
 * /api/users/{followingId}/follow:
 *   post:
 *     summary: Segue um usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followingId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Usuário seguido
 *       409:
 *         description: Já segue este usuário
 */
router.post('/:followingId/follow', authMiddleware, userController.followUser);

/**
 * @swagger
 * /api/users/{followingId}/unfollow:
 *   delete:
 *     summary: Deixa de seguir um usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followingId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deixou de seguir
 */
router.delete('/:followingId/unfollow', authMiddleware, userController.unfollowUser);

module.exports = router;
