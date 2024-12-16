import express from 'express';
import {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketsByCategory
} from '../controllers/ticket.controller.js';

const ticketRoutes = express.Router();

// Rutas CRUD básicas
ticketRoutes.post('/tickets', createTicket);
ticketRoutes.get('/tickets', getAllTickets);
ticketRoutes.get('/tickets/:id', getTicketById);
ticketRoutes.put('/tickets/:id', updateTicket);
ticketRoutes.delete('/tickets/:id', deleteTicket);

// Rutas adicionales
ticketRoutes.get('/tickets/category/:category', getTicketsByCategory);

export { ticketRoutes }; 