import Ticket from '../models/ticket.model.js';
import TicketHistory from '../models/ticket-history.model.js';

// Función auxiliar para registrar cambios
const logTicketChange = async (ticketId, userId, changeType, previousData, currentData, req) => {
  try {
    const historyEntry = new TicketHistory({
      ticketId,
      changedBy: userId,
      changeType,
      changes: {
        previous: previousData,
        current: currentData
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: req.body.notes // Opcional: notas sobre el cambio
    });

    await historyEntry.save();
  } catch (error) {
    console.error('Error al registrar historial:', error);
    // No lanzamos el error para no interrumpir la operación principal
  }
};

export const createTicket = async (req, res) => {
  try {
    const newTicket = new Ticket({
      ...req.body,
      ticketNumber: `TKT-${Date.now()}`
    });
    
    const savedTicket = await newTicket.save();

    // Registrar la creación en el historial
    await logTicketChange(
      savedTicket._id,
      req.user.id, // Del middleware de autenticación
      'CREATED',
      null,
      savedTicket.toObject(),
      req
    );

    res.status(201).json(savedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email');
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email');
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTicket = async (req, res) => {
  try {
    // Obtener el ticket actual antes de actualizarlo
    const previousTicket = await Ticket.findById(req.params.id);
    
    if (!previousTicket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    // Determinar el tipo de cambio
    let changeType = 'UPDATED';
    if (req.body.status && req.body.status !== previousTicket.status) {
      changeType = 'STATUS_CHANGE';
    } else if (req.body.priority && req.body.priority !== previousTicket.priority) {
      changeType = 'PRIORITY_CHANGE';
    } else if (req.body.assignedTo && req.body.assignedTo !== previousTicket.assignedTo?.toString()) {
      changeType = 'ASSIGNMENT_CHANGE';
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true }
    );

    // Registrar el cambio en el historial
    await logTicketChange(
      updatedTicket._id,
      req.user.id,
      changeType,
      previousTicket.toObject(),
      updatedTicket.toObject(),
      req
    );

    res.json(updatedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    const deletedTicket = await Ticket.findByIdAndDelete(req.params.id);
    if (!deletedTicket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }
    res.json({ message: 'Ticket eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTicketsByCategory = async (req, res) => {
  try {
    const tickets = await Ticket.find({ category: req.params.category });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Nuevo endpoint para consultar el historial de un ticket
export const getTicketHistory = async (req, res) => {
  try {
    const history = await TicketHistory.find({ ticketId: req.params.id })
      .populate('changedBy', 'name email')
      .sort({ timestamp: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
