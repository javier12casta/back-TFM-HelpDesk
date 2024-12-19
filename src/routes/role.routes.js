import express from 'express';
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole
} from '../controllers/role.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const roleRoutes = express.Router();

roleRoutes.post('/roles', authMiddleware, createRole);
roleRoutes.get('/roles', authMiddleware, getAllRoles);
roleRoutes.get('/roles/:id', authMiddleware, getRoleById);
roleRoutes.put('/roles/:id', authMiddleware, updateRole);
roleRoutes.delete('/roles/:id', authMiddleware, deleteRole);

export { roleRoutes }; 