import Ticket from '../models/ticket.model.js';
import TicketHistory from '../models/ticket-history.model.js';
import Category from '../models/category.model.js';
import Area from '../models/area.model.js';
import transporter from '../config/nodemailer.config.js';
import { io } from '../server.js';
import { createNotification } from './notification.controller.js';
import Role from '../models/role.model.js';
import User from '../models/user.model.js';
import Comment from '../models/comment.model.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/ticket-attachments');
    console.log('Directorio de upload:', uploadDir);
    
    try {
      if (!fs.existsSync(uploadDir)) {
        console.log('Creando directorio:', uploadDir);
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      console.log('Directorio existe o fue creado exitosamente');
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error al crear directorio:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const filename = Date.now() + '-' + file.originalname;
    console.log('Nombre de archivo a crear:', filename);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  }
}).single('attachment');

// Agregar comentario a un ticket
export const addComment = async (req, res) => {
  try {
    upload(req, res, async function(err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'Error al subir archivo: ' + err.message });
      } else if (err) {
        return res.status(500).json({ message: 'Error al procesar archivo' });
      }

      const { ticketId } = req.params;
      const { text, newStatus } = req.body;
      const userId = req.user.id;

      // Verificar que el ticket existe
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket no encontrado' });
      }

      // Crear el comentario
      const comment = new Comment({
        ticketId,
        userId,
        text,
        attachment: req.file ? {
          filename: req.file.originalname,
          path: req.file.path,
          mimetype: req.file.mimetype
        } : undefined
      });

      // Si hay cambio de estado
      if (newStatus && newStatus !== ticket.status) {
        comment.statusChange = {
          oldStatus: ticket.status,
          newStatus: newStatus
        };
        
        // Actualizar estado del ticket
        ticket.status = newStatus;
        await ticket.save();

        // Notificar cambio de estado
        await createNotification(ticket.clientId, {
          type: 'info',
          title: 'Estado de Ticket Actualizado',
          message: `El estado del ticket ${ticket.ticketNumber} ha cambiado a ${newStatus}`,
          ticketId: ticket._id
        });
      }

      await comment.save();

      // Poblar la información del usuario
      const populatedComment = await Comment.findById(comment._id)
        .populate('userId', 'username name email');

      // Notificar a los involucrados
      const notifyUsers = new Set([
        ticket.clientId.toString(),
        ticket.assignedTo?.toString()
      ].filter(Boolean));

      notifyUsers.forEach(async (userId) => {
        if (userId !== req.user.id) {
          await createNotification(userId, {
            type: 'info',
            title: 'Nuevo Comentario en Ticket',
            message: `Se ha agregado un nuevo comentario al ticket ${ticket.ticketNumber}`,
            ticketId: ticket._id
          });
        }
      });

      // Notificar por Socket.IO
      notifyUsers.forEach((userId) => {
        io.to(userId).emit('newComment', {
          ticket: ticket,
          comment: populatedComment
        });
      });

      res.status(201).json({
        success: true,
        data: populatedComment
      });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener comentarios de un ticket
export const getTicketComments = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;

    // Verificar acceso al ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    // Verificar permisos
    const user = await User.findById(userId).populate('role', 'name');
    const isAdmin = user.role.name === 'admin';
    const isSupervisor = user.role.name === 'supervisor';
    const isSupport = user.role.name === 'soporte';

    if (!isAdmin && 
        ticket.clientId.toString() !== userId && 
        ticket.assignedTo?.toString() !== userId &&
        !(isSupervisor && user.area && ticket.area.toString() === user.area.toString())) {
      return res.status(403).json({ message: 'No tiene permiso para ver estos comentarios' });
    }

    // Obtener comentarios
    const comments = await Comment.find({ ticketId })
      .populate('userId', 'username name email')
      .sort({ createdAt: 'asc' });

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createTicket = async (req, res) => {
  try {
    upload(req, res, async function(err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'Error al subir archivo: ' + err.message });
      } else if (err) {
        return res.status(500).json({ message: 'Error al procesar archivo' });
      }

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
        ticketNumber: `TKT-${Date.now()}`,
        attachment: req.file ? {
          filename: req.file.originalname,
          path: req.file.path,
          mimetype: req.file.mimetype
        } : undefined
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
          ${req.file ? `\nArchivo adjunto: ${req.file.originalname}` : ''}

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
    });
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
    
    // Obtener el usuario con su rol
    const user = await User.findById(userId)
      .populate('role', 'name');

    const ticket = await Ticket.findById(req.params.id)
      .populate('category', 'nombre_categoria descripcion_categoria color_categoria')
      .populate('clientId', 'name email username')
      .populate('assignedTo', 'name email username')
      .populate('area', 'area');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    // Verificar permisos según el rol
    const isAdmin = await isUserAdmin(req.user.role);
    const isSupervisor = user.role?.name === 'supervisor';
    const isSupport = user.role?.name === 'soporte';
    const isCreator = ticket.clientId._id.toString() === userId;
    const isAssignedAgent = ticket.assignedTo?._id.toString() === userId;
    const isSupervisorOfArea = isSupervisor && user.area && ticket.area.toString() === user.area.toString();

    // Permitir acceso si cumple alguna de estas condiciones:
    // 1. Es admin
    // 2. Es el creador del ticket
    // 3. Es el agente de soporte asignado
    // 4. Es supervisor del área del ticket
    if (!isAdmin && 
        !isCreator && 
        !isAssignedAgent &&
        !isSupervisorOfArea) {
      return res.status(403).json({ 
        success: false,
        message: 'No tiene permiso para ver este ticket' 
      });
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

    // Agregar información de permisos a la respuesta
    ticketResponse.permissions = {
      canView: true,
      canEdit: isAdmin || isCreator || (isSupport && isAssignedAgent) || isSupervisorOfArea,
      canDelete: isAdmin,
      canChangeStatus: isAdmin || isAssignedAgent || isSupervisorOfArea,
      canAssign: isAdmin || isSupervisorOfArea,
      canComment: true
    };

    res.json({
      success: true,
      data: ticketResponse
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

export const updateTicket = async (req, res) => {
  try {
    upload(req, res, async function(err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'Error al subir archivo: ' + err.message });
      } else if (err) {
        return res.status(500).json({ message: 'Error al procesar archivo: ' + err.message });
      }

      const userId = req.user.id;
      const isAdmin = await isUserAdmin(req.user.role);

      const previousTicket = await Ticket.findById(req.params.id);
      
      if (!previousTicket) {
        return res.status(404).json({ message: 'Ticket no encontrado' });
      }

      // Verificar permisos
      const user = await User.findById(userId).populate('role', 'name');
      const isSupervisor = user.role?.name === 'supervisor';
      const isSupport = user.role?.name === 'soporte';
      const isCreator = previousTicket.clientId.toString() === userId;
      const isAssignedAgent = previousTicket.assignedTo?.toString() === userId;
      const isSupervisorOfArea = isSupervisor && user.area && previousTicket.area.toString() === user.area.toString();

      if (!isAdmin && !isCreator && !isAssignedAgent && !isSupervisorOfArea) {
        return res.status(403).json({ message: 'No tiene permiso para actualizar este ticket' });
      }

      // Verificar si el ticket está en estado pendiente para actualizar el archivo
      if (req.file && previousTicket.status !== 'Pendiente') {
        return res.status(400).json({
          message: 'Solo se puede modificar el archivo adjunto cuando el ticket está en estado pendiente'
        });
      }

      // Preparar datos de actualización
      const updateData = {};
      
      // Procesar campos del FormData
      if (req.body.description) updateData.description = req.body.description;
      if (req.body.priority) updateData.priority = req.body.priority;
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.assignedTo) updateData.assignedTo = req.body.assignedTo;
      
      // Si hay un nuevo archivo adjunto
      if (req.file) {
        updateData.attachment = {
          filename: req.file.originalname,
          path: req.file.path,
          mimetype: req.file.mimetype
        };
      }

      // Si se está actualizando la categoría
      if (req.body.categoryId) {
        const category = await Category.findById(req.body.categoryId);
        if (!category) {
          return res.status(404).json({ message: 'Categoría no encontrada' });
        }
        updateData.category = req.body.categoryId;
      }

      // Si se está actualizando el área
      if (req.body.areaId) {
        const area = await Area.findById(req.body.areaId);
        if (!area) {
          return res.status(404).json({ message: 'Área no encontrada' });
        }
        updateData.area = req.body.areaId;
      }

      let changeType = 'UPDATED';
      let notificationType = 'info';
      let notificationTitle = 'Ticket Actualizado';
      let notificationMessage = `El ticket ${previousTicket.ticketNumber} ha sido actualizado`;

      // Determinar tipo de cambio para notificaciones
      if (updateData.status && updateData.status !== previousTicket.status) {
        changeType = 'STATUS_CHANGE';
        notificationMessage = `El estado del ticket ${previousTicket.ticketNumber} ha cambiado a ${updateData.status}`;
      } else if (updateData.priority && updateData.priority !== previousTicket.priority) {
        changeType = 'PRIORITY_CHANGE';
        notificationMessage = `La prioridad del ticket ${previousTicket.ticketNumber} ha cambiado a ${updateData.priority}`;
      } else if (updateData.assignedTo && updateData.assignedTo !== previousTicket.assignedTo?.toString()) {
        changeType = 'ASSIGNMENT_CHANGE';
        notificationMessage = `El ticket ${previousTicket.ticketNumber} ha sido reasignado`;
      }

      updateData.updatedAt = Date.now();

      const updatedTicket = await Ticket.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true }
      )
      .populate('category', 'nombre_categoria descripcion_categoria')
      .populate('area', 'area detalle')
      .populate('clientId', 'name email username')
      .populate('assignedTo', 'name email username');

      // Si se actualizó el archivo, crear un comentario automático
      if (req.file) {
        const comment = new Comment({
          ticketId: updatedTicket._id,
          userId,
          text: 'Se ha actualizado el archivo adjunto del ticket',
          attachment: updateData.attachment
        });
        await comment.save();
      }

      // Notificar al cliente
      await createNotification(updatedTicket.clientId._id, {
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        ticketId: updatedTicket._id
      });

      // Registrar el cambio en el historial
      await logTicketChange(
        updatedTicket._id,
        userId,
        changeType,
        previousTicket.toObject(),
        updatedTicket.toObject(),
        req
      );

      res.json({
        success: true,
        data: updatedTicket,
        message: 'Ticket actualizado correctamente'
      });
    });
  } catch (error) {
    console.error('Error en updateTicket:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor: ' + error.message 
    });
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

export const changeTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { newStatus, commentText } = req.body;
    const userId = req.user.id;

    // Verificar permisos del usuario
    const user = await User.findById(userId).populate('role', 'name');
    const isAdmin = user.role.name === 'admin';
    const isSupervisor = user.role.name === 'supervisor';
    const isSupport = user.role.name === 'soporte';

    // Obtener el ticket
    const ticket = await Ticket.findById(ticketId)
      .populate('clientId', 'email username')
      .populate('assignedTo', 'email username')
      .populate('area', 'area');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // Verificar permisos para cambiar el estado
    if (!isAdmin && 
        !isSupervisor && 
        !isSupport && 
        ticket.assignedTo?._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para cambiar el estado del ticket'
      });
    }

    // Si es supervisor, verificar que el ticket pertenece a su área
    if (isSupervisor && (!user.area || ticket.area.toString() !== user.area.toString())) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para modificar tickets de otras áreas'
      });
    }

    const oldStatus = ticket.status;
    ticket.status = newStatus;
    ticket.updatedAt = Date.now();

    // Crear un comentario si se proporcionó texto
    if (commentText) {
      const comment = new Comment({
        ticketId,
        userId,
        text: commentText,
        statusChange: {
          oldStatus,
          newStatus
        }
      });
      await comment.save();
    }

    await ticket.save();

    // Notificar al cliente
    await createNotification(ticket.clientId._id, {
      type: 'info',
      title: 'Estado de Ticket Actualizado',
      message: `El estado de tu ticket ${ticket.ticketNumber} ha cambiado a ${newStatus}`,
      ticketId: ticket._id
    });

    // Enviar correo al cliente
    const mailOptionsClient = {
      from: process.env.EMAIL_USER,
      to: ticket.clientId.email,
      subject: 'Estado de Ticket Actualizado',
      text: `
        Hola ${ticket.clientId.username},

        El estado de tu ticket ha sido actualizado:

        Número de Ticket: ${ticket.ticketNumber}
        Estado anterior: ${oldStatus}
        Nuevo estado: ${newStatus}
        ${commentText ? `\nComentario: ${commentText}` : ''}

        Puedes revisar los detalles en la plataforma.

        Saludos cordiales,
        Equipo de Soporte
      `
    };

    await transporter.sendMail(mailOptionsClient);

    // Si hay un agente asignado diferente al que hace el cambio, notificarle
    if (ticket.assignedTo && ticket.assignedTo._id.toString() !== userId) {
      await createNotification(ticket.assignedTo._id, {
        type: 'info',
        title: 'Estado de Ticket Actualizado',
        message: `El estado del ticket ${ticket.ticketNumber} ha cambiado a ${newStatus}`,
        ticketId: ticket._id
      });

      const mailOptionsAgent = {
        from: process.env.EMAIL_USER,
        to: ticket.assignedTo.email,
        subject: 'Estado de Ticket Actualizado',
        text: `
          Hola ${ticket.assignedTo.username},

          El estado del ticket que tienes asignado ha sido actualizado:

          Número de Ticket: ${ticket.ticketNumber}
          Estado anterior: ${oldStatus}
          Nuevo estado: ${newStatus}
          ${commentText ? `\nComentario: ${commentText}` : ''}

          Por favor, revisa la plataforma para más detalles.

          Saludos cordiales,
          Equipo de Soporte
        `
      };

      await transporter.sendMail(mailOptionsAgent);
    }

    // Registrar el cambio en el historial
    await logTicketChange(
      ticket._id,
      userId,
      'STATUS_CHANGE',
      { status: oldStatus },
      { status: newStatus },
      req
    );

    // Notificar por Socket.IO
    io.to(ticket.clientId._id.toString()).emit('ticketStatusChanged', {
      ticket,
      oldStatus,
      newStatus,
      message: `El estado del ticket ${ticket.ticketNumber} ha cambiado a ${newStatus}`
    });

    res.json({
      success: true,
      message: 'Estado del ticket actualizado correctamente',
      ticket
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
