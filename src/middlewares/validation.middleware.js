import { check, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Validación para creación y actualización de tickets
export const validateTicket = [
  (req, res, next) => {
    // Log para debugging
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Raw Body:', req.body);
    console.log('Description value:', req.body.description);
    console.log('CategoryId value:', req.body.categoryId);
    console.log('Subcategory value:', req.body.subcategory);
    console.log('Priority value:', req.body.priority);
    next();
  },

  check('description')
    .exists()
    .custom((value, { req }) => {
      const description = req.body?.description;
      console.log('Checking description:', description);
      
      if (!description || description === 'undefined' || description === '') {
        throw new Error('La descripción es requerida');
      }
      if (description.length < 10) {
        throw new Error('La descripción debe tener al menos 10 caracteres');
      }
      return true;
    }),
  
  check('categoryId')
    .exists()
    .custom((value, { req }) => {
      const categoryId = req.body?.categoryId;
      console.log('Checking categoryId:', categoryId);
      
      if (!categoryId || categoryId === 'undefined' || categoryId === '') {
        throw new Error('La categoría es requerida');
      }
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new Error('ID de categoría no válido');
      }
      return true;
    }),
  
  check('subcategory')
    .exists()
    .custom((value, { req }) => {
      const subcategory = req.body?.subcategory;
      console.log('Checking subcategory:', subcategory);
      
      if (!subcategory || subcategory === 'undefined' || subcategory === '') {
        throw new Error('La subcategoría es requerida');
      }
      
      let subcategoryObj;
      try {
        subcategoryObj = typeof subcategory === 'string' ? JSON.parse(subcategory) : subcategory;
        console.log('Parsed subcategory:', subcategoryObj);
      } catch (error) {
        console.error('Error parsing subcategory:', error);
        throw new Error('Formato de subcategoría inválido');
      }

      if (!subcategoryObj.nombre_subcategoria) {
        throw new Error('El nombre de la subcategoría es requerido');
      }

      if (!subcategoryObj.subcategoria_detalle) {
        throw new Error('El detalle de la subcategoría es requerido');
      }

      if (!subcategoryObj.subcategoria_detalle.nombre_subcategoria_detalle) {
        throw new Error('El nombre del detalle de la subcategoría es requerido');
      }

      return true;
    }),
  
  check('priority')
    .exists()
    .custom((value, { req }) => {
      const priority = req.body?.priority;
      console.log('Checking priority:', priority);
      
      if (!priority || priority === 'undefined' || priority === '') {
        throw new Error('La prioridad es requerida');
      }
      if (!['Baja', 'Media', 'Alta'].includes(priority)) {
        throw new Error('Prioridad no válida');
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validación para reportes
export const validateReportQuery = [
  check('startDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio debe ser una fecha válida'),
  
  check('endDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin debe ser una fecha válida')
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate < req.query.startDate) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      return true;
    }),
  
  check('categories')
    .optional()
    .custom((value) => {
      const categories = value.split(',');
      const validCategories = ['Atención al Cliente', 'Operaciones Bancarias', 'Reclamos', 'Servicios Digitales'];
      return categories.every(cat => validCategories.includes(cat));
    })
    .withMessage('Una o más categorías no son válidas'),
  
  check('priority')
    .optional()
    .custom((value) => {
      const priorities = value.split(',');
      return priorities.every(p => ['Baja', 'Media', 'Alta'].includes(p));
    })
    .withMessage('Una o más prioridades no son válidas'),
  
  check('status')
    .optional()
    .custom((value) => {
      const statuses = value.split(',');
      return statuses.every(s => ['Pendiente', 'En Proceso', 'Resuelto', 'Cancelado'].includes(s));
    })
    .withMessage('Uno o más estados no son válidos'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validación para parámetros de rendimiento de agentes
export const validateAgentPerformanceQuery = [
  check('agentId')
    .notEmpty()
    .withMessage('El ID del agente es requerido')
    .isMongoId()
    .withMessage('ID de agente no válido'),
  
  check('startDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio debe ser una fecha válida'),
  
  check('endDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin debe ser una fecha válida'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateHistoryNotes = [
  check('notes')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('Las notas deben tener entre 10 y 500 caracteres'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
