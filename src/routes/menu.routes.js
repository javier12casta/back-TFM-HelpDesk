import express from 'express';
import {
  createMenu,
  getAllMenus,
  getMenuById,
  updateMenu,
  deleteMenu
} from '../controllers/menu.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const menuRoutes = express.Router();

menuRoutes.post('/menus', authMiddleware, createMenu);
menuRoutes.get('/menus', authMiddleware, getAllMenus);
menuRoutes.get('/menus/:id', authMiddleware, getMenuById);
menuRoutes.put('/menus/:id', authMiddleware, updateMenu);
menuRoutes.delete('/menus/:id', authMiddleware, deleteMenu);

export { menuRoutes }; 