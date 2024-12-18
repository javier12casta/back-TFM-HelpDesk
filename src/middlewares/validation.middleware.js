import { check, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Validación para creación y actualización de tickets
export const validateTicket = [
  check('description')
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isLength({ min: 10 })
    .withMessage('La descripción debe tener al menos 10 caracteres'),
  
  check('categoryId')
    .notEmpty()
    .withMessage('La categoría es requerida')
    .custom((value) => {
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage('ID de categoría no válido'),
  
  check('subcategory')
    .notEmpty()
    .withMessage('La subcategoría es requerida')
    .isObject()
    .withMessage('Formato de subcategoría inválido'),
  
  check('subcategory.nombre_subcategoria')
    .notEmpty()
    .withMessage('El nombre de la subcategoría es requerido'),
  
  check('subcategory.subcategoria_detalle')
    .notEmpty()
    .withMessage('El detalle de la subcategoría es requerido')
    .isObject()
    .withMessage('Formato de detalle de subcategoría inválido'),
  
  check('subcategory.subcategoria_detalle.nombre_subcategoria_detalle')
    .notEmpty()
    .withMessage('El nombre del detalle de la subcategoría es requerido'),
  
  check('priority')
    .notEmpty()
    .withMessage('La prioridad es requerida')
    .isIn(['Baja', 'Media', 'Alta'])
    .withMessage('Prioridad no válida'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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
