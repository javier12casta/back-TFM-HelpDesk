import express from 'express';
import {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketsByCategory
} from '../controllers/ticket.controller.js';
import { validateTicket } from '../middlewares/validation.middleware.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const ticketRoutes = express.Router();

// Rutas CRUD básicas con validación
ticketRoutes.post('/tickets', authMiddleware, validateTicket, createTicket);
ticketRoutes.get('/tickets', authMiddleware, getAllTickets);
ticketRoutes.get('/tickets/:id', authMiddleware, getTicketById);
ticketRoutes.put('/tickets/:id', authMiddleware, validateTicket, updateTicket);
ticketRoutes.delete('/tickets/:id', authMiddleware, deleteTicket);

// Rutas adicionales
ticketRoutes.get('/tickets/category/:category', authMiddleware, getTicketsByCategory);

export { ticketRoutes }; 