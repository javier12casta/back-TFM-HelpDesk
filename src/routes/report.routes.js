import { Router } from 'express';
import {
  getTicketStats,
  getAreaStats,
  getCategoryStats,
  downloadExcelReport
} from '../controllers/report.controller.js';

export const reportRoutes = Router();

/**
 * @swagger
 * /api/reports/tickets:
 *   get:
 *     summary: Obtener estadísticas generales de tickets
 *     tags: [Reportes]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (YYYY-MM-DD)
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *         description: ID del área para filtrar
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Categoría para filtrar
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTickets:
 *                   type: number
 *                   description: Total de tickets
 *                 resolvedTickets:
 *                   type: number
 *                   description: Tickets resueltos
 *                 pendingTickets:
 *                   type: number
 *                   description: Tickets pendientes
 *                 inProgressTickets:
 *                   type: number
 *                   description: Tickets en proceso
 *                 avgResolutionTime:
 *                   type: number
 *                   description: Tiempo promedio de resolución en horas
 *                 resolutionRate:
 *                   type: number
 *                   description: Tasa de resolución en porcentaje
 *       500:
 *         description: Error del servidor
 */
reportRoutes.get('/reports/tickets', getTicketStats);

/**
 * @swagger
 * /api/reports/areas:
 *   get:
 *     summary: Obtener estadísticas de tickets por área
 *     tags: [Reportes]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Estadísticas por área obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   area:
 *                     type: string
 *                     description: Nombre del área
 *                   total:
 *                     type: number
 *                     description: Total de tickets
 *                   resolved:
 *                     type: number
 *                     description: Tickets resueltos
 *                   pending:
 *                     type: number
 *                     description: Tickets pendientes
 *                   inProgress:
 *                     type: number
 *                     description: Tickets en proceso
 *                   resolutionRate:
 *                     type: number
 *                     description: Tasa de resolución en porcentaje
 *       500:
 *         description: Error del servidor
 */
reportRoutes.get('/reports/areas', getAreaStats);

/**
 * @swagger
 * /api/reports/categories:
 *   get:
 *     summary: Obtener estadísticas de tickets por categoría
 *     tags: [Reportes]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Estadísticas por categoría obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: Nombre de la categoría
 *                   total:
 *                     type: number
 *                     description: Total de tickets
 *                   resolved:
 *                     type: number
 *                     description: Tickets resueltos
 *                   pending:
 *                     type: number
 *                     description: Tickets pendientes
 *                   inProgress:
 *                     type: number
 *                     description: Tickets en proceso
 *       500:
 *         description: Error del servidor
 */
reportRoutes.get('/reports/categories', getCategoryStats);

/**
 * @swagger
 * /api/reports/download:
 *   get:
 *     summary: Descargar reporte de tickets en Excel
 *     tags: [Reportes]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (YYYY-MM-DD)
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *         description: ID del área para filtrar
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Categoría para filtrar
 *     responses:
 *       200:
 *         description: Archivo Excel generado exitosamente
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Error del servidor
 */
reportRoutes.get('/reports/download', downloadExcelReport);

export default reportRoutes;
