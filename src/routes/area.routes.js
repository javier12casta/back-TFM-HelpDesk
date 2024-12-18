import express from 'express';
import {
  createAreas,
  getAllAreas,
  getAreaById,
  updateArea,
  deleteArea
} from '../controllers/area.controller.js';

const areaRoutes = express.Router();

// Ruta para crear múltiples áreas
areaRoutes.post('/areas/bulk', createAreas);

// Rutas CRUD básicas
areaRoutes.get('/areas', getAllAreas);
areaRoutes.get('/areas/:id', getAreaById);
areaRoutes.put('/areas/:id', updateArea);
areaRoutes.delete('/areas/:id', deleteArea);

export { areaRoutes }; 