import express from 'express';
import {
  createCategories,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from '../controllers/category.controller.js';

const categoryRoutes = express.Router();

// Ruta para crear múltiples categorías
categoryRoutes.post('/categories/bulk', createCategories);

// Rutas CRUD básicas
categoryRoutes.get('/categories', getAllCategories);
categoryRoutes.get('/categories/:id', getCategoryById);
categoryRoutes.put('/categories/:id', updateCategory);
categoryRoutes.delete('/categories/:id', deleteCategory);

export { categoryRoutes }; 