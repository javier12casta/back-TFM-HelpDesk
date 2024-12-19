import Ticket from '../models/ticket.model.js';
import TicketHistory from '../models/ticket-history.model.js';
import Category from '../models/category.model.js';
import Area from '../models/area.model.js';
import transporter from '../config/nodemailer.config.js';
import { io } from '../server.js';
import { createNotification } from './notification.controller.js';

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

    // Crear notificación para el creador del ticket
    await createNotification(userId, {
      type: 'success',
      title: 'Ticket Creado',
      message: `Tu ticket ${savedTicket.ticketNumber} ha sido creado exitosamente`,
      ticketId: savedTicket._id
    });

    // Si hay un agente asignado, crear notificación para él
    if (assignedTo) {
      await createNotification(assignedTo, {
        type: 'info',
        title: 'Nuevo Ticket Asignado',
        message: `Se te ha asignado el ticket ${savedTicket.ticketNumber}`,
        ticketId: savedTicket._id
      });
    }

    // Poblar los campos de referencia para la respuesta
    const populatedTicket = await Ticket.findById(savedTicket._id)
      .populate('category', 'nombre_categoria descripcion_categoria')
      .populate('area', 'area detalle')
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email');

    // Notificar a los administradores (si es necesario)
    io.to('admin').emit('ticketCreated', {
      ticket: populatedTicket,
      message: `Nuevo ticket creado: ${savedTicket.ticketNumber}`
    });

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

    // Obtener la categoría completa para acceder a las subcategorías
    const fullCategory = await Category.findById(ticket.category._id);
    
    // Buscar la subcategoría correspondiente y su ID
    const subcategoria = fullCategory.subcategorias.find(
      sub => sub.nombre_subcategoria === ticket.subcategory.nombre_subcategoria
    );

    // Buscar el detalle de la subcategoría y su ID
    const subcategoriaDetalle = subcategoria?.subcategorias_detalle.find(
      det => det.nombre_subcategoria_detalle === ticket.subcategory.subcategoria_detalle.nombre_subcategoria_detalle
    );

    // Crear una copia del ticket para modificar la respuesta
    const ticketResponse = ticket.toObject();

    // Agregar los IDs a la respuesta
    if (subcategoria) {
      ticketResponse.subcategory = {
        ...ticketResponse.subcategory,
        _id: subcategoria._id,
        subcategoria_detalle: {
          ...ticketResponse.subcategory.subcategoria_detalle,
          _id: subcategoriaDetalle?._id
        }
      };
    }

    res.json(ticketResponse);
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
    let notificationType = 'info';
    let notificationTitle = 'Ticket Actualizado';
    let notificationMessage = `El ticket ${previousTicket.ticketNumber} ha sido actualizado`;

    if (req.body.status && req.body.status !== previousTicket.status) {
      changeType = 'STATUS_CHANGE';
      notificationMessage = `El estado del ticket ${previousTicket.ticketNumber} ha cambiado a ${req.body.status}`;
    } else if (req.body.priority && req.body.priority !== previousTicket.priority) {
      changeType = 'PRIORITY_CHANGE';
      notificationMessage = `La prioridad del ticket ${previousTicket.ticketNumber} ha cambiado a ${req.body.priority}`;
    } else if (req.body.assignedTo && req.body.assignedTo !== previousTicket.assignedTo?.toString()) {
      changeType = 'ASSIGNMENT_CHANGE';
      notificationMessage = `El ticket ${previousTicket.ticketNumber} ha sido reasignado`;
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

    // Crear notificación para el creador del ticket
    await createNotification(previousTicket.clientId, {
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      ticketId: updatedTicket._id
    });

    // Notificar por Socket.IO
    io.to(userId).emit('ticketUpdated', {
      ticket: updatedTicket,
      message: notificationMessage
    });

    if (updatedTicket.assignedTo) {
      await createNotification(updatedTicket.assignedTo._id, {
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        ticketId: updatedTicket._id
      });
      // Notificar al agente por Socket.IO
      io.to(updatedTicket.assignedTo._id.toString()).emit('ticketUpdated', {
        ticket: updatedTicket,
        message: notificationMessage
      });

      // Enviar correo al agente
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: updatedTicket.assignedTo.email,
        subject: notificationTitle,
        text: `
          ${notificationMessage}
          Descripción: ${updatedTicket.description}
          Categoría: ${updatedTicket.category.nombre_categoria}
          Subcategoría: ${updatedTicket.subcategory.nombre_subcategoria}
          Detalle: ${updatedTicket.subcategory.subcategoria_detalle.nombre_subcategoria_detalle}
          Área: ${updatedTicket.area.area}
          Prioridad: ${updatedTicket.priority}
          Estado: ${updatedTicket.status}
        `
      };

      await transporter.sendMail(mailOptions);
    }

    // Si el ticket fue reasignado, notificar al agente anterior
    if (changeType === 'ASSIGNMENT_CHANGE' && previousTicket.assignedTo) {
      await createNotification(previousTicket.assignedTo, {
        type: 'warning',
        title: 'Ticket Reasignado',
        message: `El ticket ${updatedTicket.ticketNumber} ha sido asignado a otro agente`,
        ticketId: updatedTicket._id
      });
      // Notificar al agente anterior por Socket.IO
      io.to(previousTicket.assignedTo.toString()).emit('ticketReassigned', {
        ticket: updatedTicket,
        message: `El ticket ${updatedTicket.ticketNumber} ha sido asignado a otro agente`
      });

      // Enviar correo al agente anterior
      const mailOptionsForPrevious = {
        from: process.env.EMAIL_USER,
        to: previousTicket.assignedTo.email,
        subject: 'Ticket Reasignado',
        text: `El ticket ${updatedTicket.ticketNumber} ha sido asignado a otro agente.`
      };

      await transporter.sendMail(mailOptionsForPrevious);
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

    const ticket = await Ticket.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'No tiene permiso para eliminar tickets' });
    }

    // Crear notificación para el creador del ticket
    await createNotification(ticket.clientId._id, {
      type: 'warning',
      title: 'Ticket Eliminado',
      message: `El ticket ${ticket.ticketNumber} ha sido eliminado`,
      ticketId: ticket._id
    });

    // Notificar al creador por Socket.IO
    io.to(ticket.clientId._id.toString()).emit('ticketDeleted', {
      ticket: ticket,
      message: `El ticket ${ticket.ticketNumber} ha sido eliminado`
    });

    // Si había un agente asignado, notificarle también
    if (ticket.assignedTo) {
      await createNotification(ticket.assignedTo._id, {
        type: 'warning',
        title: 'Ticket Eliminado',
        message: `El ticket ${ticket.ticketNumber} que tenías asignado ha sido eliminado`,
        ticketId: ticket._id
      });

      // Notificar al agente por Socket.IO
      io.to(ticket.assignedTo._id.toString()).emit('ticketDeleted', {
        ticket: ticket,
        message: `El ticket ${ticket.ticketNumber} que tenías asignado ha sido eliminado`
      });
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

    const previousAssignee = ticket.assignedTo;
    ticket.assignedTo = assignedTo;
    const updatedTicket = await ticket.save();

    // Notificar al nuevo agente asignado
    await createNotification(assignedTo, {
      type: 'info',
      title: 'Nuevo Ticket Asignado',
      message: `Se te ha asignado el ticket ${ticket.ticketNumber}`,
      ticketId: ticket._id
    });

    // Notificar al nuevo agente por Socket.IO
    io.to(assignedTo).emit('ticketAssigned', {
      ticket: updatedTicket,
      message: `Se te ha asignado el ticket ${ticket.ticketNumber}`
    });

    // Enviar correo al nuevo agente
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: assignedTo,
      subject: 'Nuevo Ticket Asignado',
      text: `Se te ha asignado un nuevo ticket: ${updatedTicket.ticketNumber}. Descripción: ${updatedTicket.description}`
    };

    await transporter.sendMail(mailOptions);

    // Si había un agente anterior, notificarle
    if (previousAssignee) {
      await createNotification(previousAssignee, {
        type: 'warning',
        title: 'Ticket Reasignado',
        message: `El ticket ${ticket.ticketNumber} ha sido asignado a otro agente`,
        ticketId: ticket._id
      });
      // Notificar al agente anterior por Socket.IO
      io.to(previousAssignee).emit('ticketReassigned', {
        ticket: updatedTicket,
        message: `El ticket ${ticket.ticketNumber} ha sido asignado a otro agente`
      });

      // Enviar correo al agente anterior
      const mailOptionsForPrevious = {
        from: process.env.EMAIL_USER,
        to: previousAssignee.email,
        subject: 'Ticket Reasignado',
        text: `El ticket ${updatedTicket.ticketNumber} ha sido asignado a otro agente.`
      };

      await transporter.sendMail(mailOptionsForPrevious);
    }

    res.json(updatedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
