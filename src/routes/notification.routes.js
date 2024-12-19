import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  clearUserNotifications
} from '../controllers/notification.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import Notification from '../models/notification.model.js';

const notificationRoutes = express.Router();

notificationRoutes.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      userId: req.user.id 
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('ticketId', 'ticketNumber description');

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
notificationRoutes.put('/notifications/:id/read', authMiddleware, markNotificationAsRead);
notificationRoutes.delete('/notifications', authMiddleware, clearUserNotifications);

export { notificationRoutes }; 