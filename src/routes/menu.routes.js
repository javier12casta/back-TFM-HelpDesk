import express from 'express';
import {
  createMenu,
  getAllMenus,
  getMenuById,
  updateMenu,
  deleteMenu
} from '../controllers/menu.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const menuRoutes = express.Router();

/**
 * @swagger
 * /api/menus:
 *   post:
 *     summary: Crear un nuevo menú
 *     tags: [Menus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - path
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre del menú
 *               path:
 *                 type: string
 *                 description: Ruta del menú
 *               icon:
 *                 type: string
 *                 description: Icono del menú
 *               parentId:
 *                 type: string
 *                 description: ID del menú padre (si es un submenú)
 *     responses:
 *       201:
 *         description: Menú creado exitosamente
 *       400:
 *         description: Error en la solicitud
 *       401:
 *         description: No autorizado
 */
menuRoutes.post('/menus', authMiddleware, createMenu);

/**
 * @swagger
 * /api/menus:
 *   get:
 *     summary: Obtener todos los menús
 *     tags: [Menus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de menús
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       path:
 *                         type: string
 *                       icon:
 *                         type: string
 *                       parentId:
 *                         type: string
 *       401:
 *         description: No autorizado
 */
menuRoutes.get('/menus', authMiddleware, getAllMenus);

/**
 * @swagger
 * /api/menus/{id}:
 *   get:
 *     summary: Obtener un menú por ID
 *     tags: [Menus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del menú
 *     responses:
 *       200:
 *         description: Menú encontrado
 *       404:
 *         description: Menú no encontrado
 *       401:
 *         description: No autorizado
 */
menuRoutes.get('/menus/:id', authMiddleware, getMenuById);

/**
 * @swagger
 * /api/menus/{id}:
 *   put:
 *     summary: Actualizar un menú
 *     tags: [Menus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del menú
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               path:
 *                 type: string
 *               icon:
 *                 type: string
 *               parentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Menú actualizado exitosamente
 *       404:
 *         description: Menú no encontrado
 *       401:
 *         description: No autorizado
 */
menuRoutes.put('/menus/:id', authMiddleware, updateMenu);

/**
 * @swagger
 * /api/menus/{id}:
 *   delete:
 *     summary: Eliminar un menú
 *     tags: [Menus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del menú
 *     responses:
 *       200:
 *         description: Menú eliminado exitosamente
 *       404:
 *         description: Menú no encontrado
 *       401:
 *         description: No autorizado
 */
menuRoutes.delete('/menus/:id', authMiddleware, deleteMenu);

export { menuRoutes }; 