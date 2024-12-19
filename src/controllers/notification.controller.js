import Notification from '../models/notification.model.js';
import { io } from '../server.js';

export const createNotification = async (userId, notification) => {
  try {
    const newNotification = new Notification({
      userId,
      ...notification
    });

    const savedNotification = await newNotification.save();
    
    // Poblar información adicional si es necesario
    const populatedNotification = await savedNotification
      .populate('ticketId', 'ticketNumber description');
    
    // Emitir la notificación al usuario específico
    io.to(userId).emit('new-notification', populatedNotification);
    
    return populatedNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      userId: req.user.id 
    })
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id,
        userId: req.user.id
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const clearUserNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ message: 'Notificaciones eliminadas' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Función para obtener notificaciones almacenadas
export const getUserStoredNotifications = async (userId) => {
  try {
    return await Notification.find({ 
      userId,
      read: false  // Solo notificaciones no leídas
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('ticketId', 'ticketNumber description');  // Opcional: poblar datos del ticket
  } catch (error) {
    console.error('Error getting stored notifications:', error);
    throw error;
  }
}; 