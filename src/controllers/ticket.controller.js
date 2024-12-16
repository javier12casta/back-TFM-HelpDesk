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
      notes: req.body.notes
    });

    await historyEntry.save();
  } catch (error) {
    console.error('Error al registrar historial:', error);
  }
};

export const createTicket = async (req, res) => {
  try {
    const userId = req.user.id;

    const newTicket = new Ticket({
      ...req.body,
      ticketNumber: `TKT-${Date.now()}`,
      clientId: userId
    });
    
    const savedTicket = await newTicket.save();

    await logTicketChange(
      savedTicket._id,
      userId,
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
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = {};
    if (userRole !== 'admin') {
      query = { clientId: userId };
    }

    const tickets = await Ticket.find(query)
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email');
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const ticket = await Ticket.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    if (userRole !== 'admin' && ticket.clientId.toString() !== userId) {
      return res.status(403).json({ message: 'No tiene permiso para ver este ticket' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const previousTicket = await Ticket.findById(req.params.id);
    
    if (!previousTicket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    if (userRole !== 'admin' && previousTicket.clientId.toString() !== userId) {
      return res.status(403).json({ message: 'No tiene permiso para actualizar este ticket' });
    }

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

    await logTicketChange(
      updatedTicket._id,
      userId,
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
    const userId = req.user.id;
    const userRole = req.user.role;

    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'No tiene permiso para eliminar tickets' });
    }

    await Ticket.findByIdAndDelete(req.params.id);

    await logTicketChange(
      ticket._id,
      userId,
      'DELETED',
      ticket.toObject(),
      null,
      req
    );

    res.json({ message: 'Ticket eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTicketsByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = { category: req.params.category };
    
    if (userRole !== 'admin') {
      query.clientId = userId;
    }

    const tickets = await Ticket.find(query)
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email');
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTicketHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    if (userRole !== 'admin' && ticket.clientId.toString() !== userId) {
      return res.status(403).json({ message: 'No tiene permiso para ver este historial' });
    }

    const history = await TicketHistory.find({ ticketId: req.params.id })
      .populate('changedBy', 'name email')
      .sort({ timestamp: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
