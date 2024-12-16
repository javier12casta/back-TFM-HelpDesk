import express from 'express';
import {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketsByCategory,
  getTicketHistory
} from '../controllers/ticket.controller.js';
import { validateTicket } from '../middlewares/validation.middleware.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const ticketRoutes = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Ticket:
 *       type: object
 *       required:
 *         - description
 *         - category
 *         - priority
 *         - clientId
 *       properties:
 *         ticketNumber:
 *           type: string
 *           description: Número único del ticket
 *         description:
 *           type: string
 *           description: Descripción del problema
 *         category:
 *           type: string
 *           enum: ['Atención al Cliente', 'Operaciones Bancarias', 'Reclamos', 'Servicios Digitales']
 *         status:
 *           type: string
 *           enum: ['Pendiente', 'En Proceso', 'Resuelto', 'Cancelado']
 *           default: Pendiente
 *         priority:
 *           type: string
 *           enum: ['Baja', 'Media', 'Alta']
 *         clientId:
 *           type: string
 *           description: ID del cliente
 *         assignedTo:
 *           type: string
 *           description: ID del agente asignado
 */

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Crear un nuevo ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Ticket'
 *     responses:
 *       201:
 *         description: Ticket creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 */
ticketRoutes.post('/tickets', authMiddleware, validateTicket, createTicket);

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Obtener todos los tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ticket'
 */
ticketRoutes.get('/tickets', authMiddleware, getAllTickets);

/**
 * @swagger
 * /api/tickets/{id}:
 *   get:
 *     summary: Obtener un ticket por ID
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del ticket
 *     responses:
 *       200:
 *         description: Ticket encontrado
 *       404:
 *         description: Ticket no encontrado
 */
ticketRoutes.get('/tickets/:id', authMiddleware, getTicketById);

/**
 * @swagger
 * /api/tickets/{id}/history:
 *   get:
 *     summary: Obtener historial de un ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del ticket
 *     responses:
 *       200:
 *         description: Historial del ticket
 */
ticketRoutes.get('/tickets/:id/history', authMiddleware, getTicketHistory);

// Rutas adicionales
ticketRoutes.get('/tickets/category/:category', authMiddleware, getTicketsByCategory);
ticketRoutes.put('/tickets/:id', authMiddleware, validateTicket, updateTicket);
ticketRoutes.delete('/tickets/:id', authMiddleware, deleteTicket);

export { ticketRoutes }; 