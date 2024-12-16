import express from 'express';
import {
  getTicketStats,
  getAgentPerformance,
  getCategoryDistribution,
  getPriorityDistribution,
  getTimeSeriesData
} from '../controllers/report.controller.js';
import { 
  validateReportQuery, 
  validateAgentPerformanceQuery 
} from '../middlewares/validation.middleware.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const reportRoutes = express.Router();

/**
 * @swagger
 * /api/reports/tickets/stats:
 *   get:
 *     summary: Obtener estadísticas de tickets
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
reportRoutes.get('/reports/tickets/stats', 
  authMiddleware, 
  validateReportQuery, 
  getTicketStats
);

/**
 * @swagger
 * /api/reports/agents/performance:
 *   get:
 *     summary: Obtener rendimiento de agentes
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del agente
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Estadísticas de rendimiento del agente
 */
reportRoutes.get('/reports/agents/performance', 
  authMiddleware, 
  validateAgentPerformanceQuery, 
  getAgentPerformance
);

/**
 * @swagger
 * /api/reports/categories/distribution:
 *   get:
 *     summary: Obtener distribución de tickets por categoría
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Distribución de tickets por categoría
 */
reportRoutes.get('/reports/categories/distribution', 
  authMiddleware, 
  validateReportQuery, 
  getCategoryDistribution
);

/**
 * @swagger
 * /api/reports/priority/distribution:
 *   get:
 *     summary: Obtener distribución de tickets por prioridad
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Distribución de tickets por prioridad
 */
reportRoutes.get('/reports/priority/distribution', 
  authMiddleware, 
  validateReportQuery, 
  getPriorityDistribution
);

/**
 * @swagger
 * /api/reports/timeseries:
 *   get:
 *     summary: Obtener datos de series temporales de tickets
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Fecha de fin
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Agrupación temporal de los datos
 *     responses:
 *       200:
 *         description: Series temporales de tickets
 */
reportRoutes.get('/reports/timeseries', 
  authMiddleware, 
  validateReportQuery, 
  getTimeSeriesData
);

export { reportRoutes };
