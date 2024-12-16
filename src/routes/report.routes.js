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

// Rutas para reportes con validación
reportRoutes.get('/reports/tickets/stats', 
  authMiddleware, 
  validateReportQuery, 
  getTicketStats
);

reportRoutes.get('/reports/agents/performance', 
  authMiddleware, 
  validateAgentPerformanceQuery, 
  getAgentPerformance
);

reportRoutes.get('/reports/categories/distribution', 
  authMiddleware, 
  validateReportQuery, 
  getCategoryDistribution
);

reportRoutes.get('/reports/priority/distribution', 
  authMiddleware, 
  validateReportQuery, 
  getPriorityDistribution
);

reportRoutes.get('/reports/timeseries', 
  authMiddleware, 
  validateReportQuery, 
  getTimeSeriesData
);

export { reportRoutes };
