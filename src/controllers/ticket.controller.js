import Ticket from '../models/ticket.model.js';
import TicketHistory from '../models/ticket-history.model.js';
import Category from '../models/category.model.js';
import Area from '../models/area.model.js';
import transporter from '../config/nodemailer.config.js';
import { io } from '../server.js';
import { createNotification } from './notification.controller.js';
import Role from '../models/role.model.js';
import User from '../models/user.model.js';

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

// Función auxiliar para verificar si el usuario es admin
const isUserAdmin = async (roleId) => {
  try {
    const userRole = await Role.findById(roleId);
    return userRole?.name === 'admin';
  } catch (error) {
    console.error('Error al verificar rol:', error);
    return false;
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

    // Poblar los campos de referencia para la respuesta y el correo
    const populatedTicket = await Ticket.findById(savedTicket._id)
      .populate('category', 'nombre_categoria descripcion_categoria')
      .populate('area', 'area detalle')
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email');

    const user = await User.findById(populatedTicket.clientId._id);
    // Enviar correo al creador del ticket
    const mailOptionsCreator = {
      from: process.env.EMAIL_USER,
      to: populatedTicket.clientId.email,
      subject: 'Ticket Creado Exitosamente',
      text: `
        Hola ${user.username},

        Tu ticket ha sido creado exitosamente con los siguientes detalles:

        Número de Ticket: ${savedTicket.ticketNumber}
        Descripción: ${description}
        Categoría: ${populatedTicket.category.nombre_categoria}
        Subcategoría: ${subcategory.nombre_subcategoria}
        Detalle: ${subcategory.subcategoria_detalle.nombre_subcategoria_detalle}
        Área: ${populatedTicket.area.area}
        Prioridad: ${priority}
        Estado: ${savedTicket.status}

        Puedes hacer seguimiento de tu ticket en nuestra plataforma.

        Saludos cordiales,
        Equipo de Soporte
      `
    };

    await transporter.sendMail(mailOptionsCreator);

    // Código existente para notificaciones
    await createNotification(userId, {
      type: 'success',
      title: 'Ticket Creado',
      message: `Tu ticket ${savedTicket.ticketNumber} ha sido creado exitosamente`,
      ticketId: savedTicket._id
    });

    // Si hay un agente asignado, crear notificación y enviar correo
    if (assignedTo) {
      await createNotification(assignedTo, {
        type: 'info',
        title: 'Nuevo Ticket Asignado',
        message: `Se te ha asignado el ticket ${savedTicket.ticketNumber}`,
        ticketId: savedTicket._id
      });

      // Enviar correo al agente asignado
      const mailOptionsAgent = {
        from: process.env.EMAIL_USER,
        to: populatedTicket.assignedTo.email,
        subject: 'Nuevo Ticket Asignado',
        text: `
          Hola ${populatedTicket.assignedTo.name},

          Se te ha asignado un nuevo ticket:

          Número de Ticket: ${savedTicket.ticketNumber}
          Descripción: ${description}
          Categoría: ${populatedTicket.category.nombre_categoria}
          Subcategoría: ${subcategory.nombre_subcategoria}
          Detalle: ${subcategory.subcategoria_detalle.nombre_subcategoria_detalle}
          Área: ${populatedTicket.area.area}
          Prioridad: ${priority}
          Estado: ${savedTicket.status}

          Por favor, revisa la plataforma para más detalles.

          Saludos cordiales,
          Equipo de Soporte
        `
      };

      await transporter.sendMail(mailOptionsAgent);
    }

    // Notificar a los administradores
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
    const isAdmin = await isUserAdmin(req.user.role);
    
    // Obtener el usuario con su rol y área
    const user = await User.findById(userId)
      .populate('role', 'name')
      .populate('area', 'area');

    let query = {};
    
    // Si es admin, puede ver todos los tickets
    if (isAdmin) {
      // No aplicar filtros
    }
    // Si es supervisor, ver tickets de su área
    else if (user.role?.name === 'supervisor' && user.area) {
      query = { area: user.area._id };
    }
    // Si es soporte, ver tickets asignados a él
    else if (user.role?.name === 'soporte') {
      query = { assignedTo: userId };
    }
    // Si es usuario normal, solo ver sus tickets
    else {
      query = { clientId: userId };
    }

    const tickets = await Ticket.find(query)
      .populate('category', 'nombre_categoria descripcion_categoria color_categoria')
      .populate('clientId', 'name email username')
      .populate('assignedTo', 'name email username')
      .populate('area', 'area');

    // Obtener todas las categorías para acceder a los colores de las subcategorías
    const categories = await Category.find();

    // Mapear los tickets para incluir el color de la subcategoría
    const ticketsWithSubcategoryColors = await Promise.all(tickets.map(async (ticket) => {
      const ticketObj = ticket.toObject();
      
      // Buscar la categoría correspondiente
      const fullCategory = categories.find(cat => 
        cat._id.toString() === ticket.category._id.toString()
      );

      if (fullCategory) {
        // Buscar la subcategoría correspondiente
        const subcategoria = fullCategory.subcategorias.find(
          sub => sub.nombre_subcategoria === ticket.subcategory.nombre_subcategoria
        );

        if (subcategoria) {
          // Agregar el color y el ID de la subcategoría a la respuesta
          ticketObj.subcategory = {
            ...ticketObj.subcategory,
            _id: subcategoria._id,
            color_subcategoria: subcategoria.color_subcategoria,
            subcategoria_detalle: {
              ...ticketObj.subcategory.subcategoria_detalle,
              _id: subcategoria.subcategorias_detalle.find(
                det => det.nombre_subcategoria_detalle === ticket.subcategory.subcategoria_detalle.nombre_subcategoria_detalle
              )?._id
            }
          };
        }
      }

      return ticketObj;
    }));

    res.json(ticketsWithSubcategoryColors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = await isUserAdmin(req.user.role);

    const ticket = await Ticket.findById(req.params.id)
      .populate('category', 'nombre_categoria descripcion_categoria color_categoria')
      .populate('clientId', 'name email username')
      .populate('assignedTo', 'name email username')
      .populate('area', 'area');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    if (!isAdmin && ticket.clientId.toString() !== userId) {
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
    const isAdmin = await isUserAdmin(req.user.role);

    const previousTicket = await Ticket.findById(req.params.id);
    
    if (!previousTicket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    if (!isAdmin && previousTicket.clientId.toString() !== userId) {
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
    const isAdmin = await isUserAdmin(req.user.role);

    const ticket = await Ticket.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('assignedTo', 'name email');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    if (!isAdmin) {
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
    const isAdmin = await isUserAdmin(req.user.role);

    let query = { category: req.params.category };
    
    if (!isAdmin) {
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
    const isAdmin = await isUserAdmin(req.user.role);

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    if (!isAdmin && ticket.clientId.toString() !== userId) {
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

export const assignSupportUser = async (req, res) => {
  try {
    const { ticketId, supportUserId } = req.body;
    const adminId = req.user.id;
    
    // Verificar si el usuario es admin o supervisor
    const admin = await User.findById(adminId)
      .populate('role', 'name');
    
    if (!admin || (admin.role.name !== 'admin' && admin.role.name !== 'supervisor')) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para asignar tickets'
      });
    }

    // Verificar que el ticket existe
    const ticket = await Ticket.findById(ticketId)
      .populate('clientId', 'email username')
      .populate('area', 'area');

      if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // Verificar que el usuario de soporte existe y tiene el rol correcto
    const supportUser = await User.findById(supportUserId)
      .populate('role', 'name');
      
    if (!supportUser || supportUser.role.name !== 'soporte') {
      return res.status(400).json({
        success: false,
        message: 'Usuario de soporte no válido'
      });
    }

    // Si es supervisor, verificar que el ticket pertenece a su área
    if (admin.role.name === 'supervisor') {
      if (!admin.area || ticket.area.toString() !== admin.area.toString()) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para asignar tickets de otras áreas'
        });
      }
    }

    // Guardar el usuario anterior para notificaciones
    const previousAssignee = ticket.assignedTo;

    // Actualizar el ticket
    ticket.assignedTo = supportUserId;
    ticket.updatedAt = Date.now();
    await ticket.save();

    // Notificar al nuevo agente asignado
    await createNotification(supportUserId, {
      type: 'info',
      title: 'Nuevo Ticket Asignado',
      message: `Se te ha asignado el ticket ${ticket.ticketNumber}`,
      ticketId: ticket._id
    });

    // Enviar correo al nuevo agente
    const mailOptionsNewAgent = {
      from: process.env.EMAIL_USER,
      to: supportUser.email,
      subject: 'Nuevo Ticket Asignado',
      text: `
        Hola ${supportUser.username},

        Se te ha asignado un nuevo ticket:

        Número de Ticket: ${ticket.ticketNumber}
        Descripción: ${ticket.description}
        Área: ${ticket.area.area}
        Prioridad: ${ticket.priority}
        Estado: ${ticket.status}

        Por favor, revisa la plataforma para más detalles.

        Saludos cordiales,
        Equipo de Soporte
      `
    };

    await transporter.sendMail(mailOptionsNewAgent);

    // Si había un agente anterior, notificarle
    if (previousAssignee) {
      await createNotification(previousAssignee, {
        type: 'warning',
        title: 'Ticket Reasignado',
        message: `El ticket ${ticket.ticketNumber} ha sido asignado a otro agente`,
        ticketId: ticket._id
      });

      const previousAgent = await User.findById(previousAssignee);
      if (previousAgent) {
        const mailOptionsPrevious = {
          from: process.env.EMAIL_USER,
          to: previousAgent.email,
          subject: 'Ticket Reasignado',
          text: `El ticket ${ticket.ticketNumber} ha sido asignado a otro agente.`
        };
        await transporter.sendMail(mailOptionsPrevious);
      }
    }

    // Registrar el cambio en el historial
    await logTicketChange(
      ticket._id,
      adminId,
      'ASSIGNMENT_CHANGE',
      { assignedTo: previousAssignee },
      { assignedTo: supportUserId },
      req
    );

    // Notificar por Socket.IO
    io.to(supportUserId).emit('ticketAssigned', {
      ticket,
      message: `Se te ha asignado el ticket ${ticket.ticketNumber}`
    });

    res.json({
      success: true,
      message: 'Ticket asignado correctamente',
      ticket
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
