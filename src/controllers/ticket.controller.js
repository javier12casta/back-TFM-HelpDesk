import Ticket from '../models/ticket.model.js';
import TicketHistory from '../models/ticket-history.model.js';
import Category from '../models/category.model.js';
import Area from '../models/area.model.js';
import transporter from '../config/nodemailer.config.js';
import { io } from '../server.js';

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

// Función auxiliar para determinar el área basada en categoría y subcategoría
const determineArea = async (categoryId, subcategory) => {
  try {
    const category = await Category.findById(categoryId);
    if (!category) throw new Error('Categoría no encontrada');

    // Mapeo de categorías y subcategorías a áreas
    const areaMapping = {
      'Incidentes (Tecnología)': {
        'Hardware': 'Tecnología y Sistemas',
        'Software': 'Tecnología y Sistemas',
        'Redes y Conectividad': 'Tecnología y Sistemas',
        'Seguridad y Ciberseguridad': {
          default: 'Tecnología y Sistemas',
          conditions: {
            'Phishing': 'Riesgos y Seguridad',
            'Malware': 'Riesgos y Seguridad',
            'Incidentes de acceso no autorizado': 'Riesgos y Seguridad'
          }
        },
        'Soporte de Base de Datos': {
          default: 'Tecnología y Sistemas',
          conditions: {
            'Optimización de bases de datos': 'Desarrollo y Proyectos'
          }
        }
      },
      'Gestión Interna': {
        'Recursos Humanos': 'Recursos Humanos',
        'Soporte a Colaboradores': {
          default: 'Tecnología y Sistemas',
          conditions: {
            'Acceso a aplicaciones': 'Tecnología y Sistemas',
            'Reemplazo de equipos': 'Tecnología y Sistemas',
            'Solicitudes de beneficios': 'Recursos Humanos'
          }
        },
        'Finanzas': 'Finanzas y Contabilidad',
        'Gestión Administrativa': 'Administración y Logística'
      }
    };

    // Determinar el área basada en el mapeo
    const categoryName = category.nombre_categoria;
    const subcategoryName = subcategory.nombre_subcategoria;
    const subcategoryDetail = subcategory.subcategoria_detalle.nombre_subcategoria_detalle;

    let areaName;
    const categoryMap = areaMapping[categoryName];
    
    if (categoryMap) {
      const subcategoryMap = categoryMap[subcategoryName];
      
      if (typeof subcategoryMap === 'string') {
        areaName = subcategoryMap;
      } else if (subcategoryMap && typeof subcategoryMap === 'object') {
        // Verificar si hay una condición específica para el detalle
        areaName = subcategoryMap.conditions[subcategoryDetail] || subcategoryMap.default;
      }
    }

    if (!areaName) {
      throw new Error('No se pudo determinar el área automáticamente');
    }

    // Buscar el ID del área
    const area = await Area.findOne({ area: areaName });
    if (!area) {
      throw new Error(`Área ${areaName} no encontrada en la base de datos`);
    }

    return area._id;
  } catch (error) {
    throw error;
  }
};

export const createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      description,
      categoryId,
      subcategory,
      priority,
      assignedTo
    } = req.body;

    // Verificar que la categoría existe
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Determinar el área automáticamente
    let areaId;
    try {
      areaId = await determineArea(categoryId, subcategory);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const newTicket = new Ticket({
      description,
      category: categoryId,
      subcategory,
      priority,
      clientId: userId,
      assignedTo,
      area: areaId,
      ticketNumber: `TKT-${Date.now()}`
    });
    
    const savedTicket = await newTicket.save();

    // Poblar los campos de referencia para la respuesta
    const populatedTicket = await Ticket.findById(savedTicket._id)
      .populate('category', 'nombre_categoria descripcion_categoria')
      .populate('area', 'area detalle')
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email');

    // Notificar por Socket.IO
    io.emit('ticketCreated', {
      ticket: populatedTicket,
      message: `Nuevo ticket creado: ${savedTicket.ticketNumber}`
    });

    // Enviar correo si hay un agente asignado
    if (assignedTo) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: populatedTicket.assignedTo.email,
        subject: 'Nuevo Ticket Asignado',
        text: `
          Se ha creado un nuevo ticket: ${savedTicket.ticketNumber}
          Descripción: ${description}
          Categoría: ${populatedTicket.category.nombre_categoria}
          Subcategoría: ${subcategory.nombre_subcategoria}
          Detalle: ${subcategory.subcategoria_detalle.nombre_subcategoria_detalle}
          Área: ${populatedTicket.area.area}
          Prioridad: ${priority}
        `
      };

      await transporter.sendMail(mailOptions);
    }

    await logTicketChange(
      savedTicket._id,
      userId,
      'CREATED',
      null,
      savedTicket.toObject(),
      req
    );

    res.status(201).json(populatedTicket);
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
      .populate('category', 'nombre_categoria descripcion_categoria color_categoria')
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('area', 'area');

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
      .populate('category', 'nombre_categoria descripcion_categoria color_categoria')
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('area', 'area');

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

    // Si se está actualizando la categoría, verificar que existe
    if (req.body.categoryId) {
      const category = await Category.findById(req.body.categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }
      req.body.category = req.body.categoryId;
      delete req.body.categoryId;
    }

    // Si se está actualizando el área, verificar que existe
    if (req.body.areaId) {
      const area = await Area.findById(req.body.areaId);
      if (!area) {
        return res.status(404).json({ message: 'Área no encontrada' });
      }
      req.body.area = req.body.areaId;
      delete req.body.areaId;
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
    )
    .populate('category', 'nombre_categoria descripcion_categoria')
    .populate('area', 'area detalle')
    .populate('clientId', 'name email')
    .populate('assignedTo', 'name email');

    // Notificar por Socket.IO
    io.emit('ticketUpdated', {
      ticket: updatedTicket,
      message: `Ticket ${updatedTicket.ticketNumber} ha sido actualizado`
    });

    // Si se cambió la asignación, enviar correo al nuevo agente
    if (changeType === 'ASSIGNMENT_CHANGE' && updatedTicket.assignedTo) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: updatedTicket.assignedTo.email,
        subject: 'Ticket Reasignado',
        text: `
          Se te ha asignado el ticket: ${updatedTicket.ticketNumber}
          Descripción: ${updatedTicket.description}
          Categoría: ${updatedTicket.category.nombre_categoria}
          Subcategoría: ${updatedTicket.subcategory.nombre_subcategoria}
          Detalle: ${updatedTicket.subcategory.subcategoria_detalle.nombre_subcategoria_detalle}
          Área: ${updatedTicket.area.area}
          Prioridad: ${updatedTicket.priority}
        `
      };

      await transporter.sendMail(mailOptions);
    }

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
      .populate('category', 'nombre_categoria descripcion_categoria color_categoria')
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('area', 'area');

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

export const assignTicket = async (req, res) => {
  try {
    const { ticketId, assignedTo } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    ticket.assignedTo = assignedTo; // Asignar el nuevo agente
    const updatedTicket = await ticket.save();

    // Notificar a los involucrados mediante Socket.IO
    io.emit('ticketAssigned', {
      ticket: updatedTicket,
      message: `Ticket ${updatedTicket.ticketNumber} ha sido asignado a ${assignedTo}`
    });

    // Enviar correo electrónico al nuevo agente asignado
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: assignedTo, // Correo del nuevo agente
      subject: 'Ticket Asignado',
      text: `Se te ha asignado un nuevo ticket: ${updatedTicket.ticketNumber}. Descripción: ${updatedTicket.description}`
    };

    await transporter.sendMail(mailOptions);

    res.json(updatedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
