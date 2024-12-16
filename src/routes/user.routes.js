import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { mfaController } from '../controllers/mfa.controller.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: ID autogenerado del usuario
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico del usuario
 *         name:
 *           type: string
 *           description: Nombre completo del usuario
 *         role:
 *           type: string
 *           enum: [user, admin, agent]
 *           description: Rol del usuario
 *         mfaEnabled:
 *           type: boolean
 *           description: Si tiene habilitada la autenticación de dos factores
 */

const userRoutes = Router();

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Datos inválidos
 */
userRoutes.post('/users', userController.createUser);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
userRoutes.get('/users', userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 */
userRoutes.get('/users/:id', userController.getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       404:
 *         description: Usuario no encontrado
 */
userRoutes.put('/users/:id', userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *       404:
 *         description: Usuario no encontrado
 */
userRoutes.delete('/users/:id', userController.deleteUser);

/**
 * @swagger
 * /api/users/mfa/generate:
 *   post:
 *     summary: Generar configuración MFA para un usuario
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración MFA generada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCode:
 *                   type: string
 *                   description: Código QR para escanear
 *                 secret:
 *                   type: string
 *                   description: Secreto MFA
 */
userRoutes.post('/users/mfa/generate', mfaController.generateMFA);

/**
 * @swagger
 * /api/users/mfa/verify:
 *   post:
 *     summary: Verificar y habilitar MFA
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de verificación MFA
 *     responses:
 *       200:
 *         description: MFA verificado y habilitado exitosamente
 *       400:
 *         description: Token inválido
 */
userRoutes.post('/users/mfa/verify', mfaController.verifyMFA);

/**
 * @swagger
 * /api/users/mfa/validate:
 *   post:
 *     summary: Validar token MFA durante el login
 *     tags: [MFA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - email
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token MFA
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del usuario
 *     responses:
 *       200:
 *         description: Token MFA validado exitosamente
 *       401:
 *         description: Token inválido
 */
userRoutes.post('/users/mfa/validate', mfaController.validateMFAForLogin);

export { userRoutes };
