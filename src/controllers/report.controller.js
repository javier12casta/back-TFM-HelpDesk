import Ticket from '../models/ticket.model.js';
import Report from '../models/report.model.js';

export const getTicketStats = async (req, res) => {
  try {
    const { startDate, endDate, categories, priority, status } = req.query;
    
    let query = {};
    
    // Construir query basado en filtros
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (categories) {
      query.category = { $in: categories.split(',') };
    }
    
    if (priority) {
      query.priority = { $in: priority.split(',') };
    }
    
    if (status) {
      query.status = { $in: status.split(',') };
    }

    // Estadísticas generales
    const totalTickets = await Ticket.countDocuments(query);
    const resolvedTickets = await Ticket.countDocuments({ ...query, status: 'Resuelto' });
    const pendingTickets = await Ticket.countDocuments({ ...query, status: 'Pendiente' });
    
    // Tiempo promedio de resolución
    const resolvedTicketsData = await Ticket.find({ 
      ...query, 
      status: 'Resuelto' 
    });
    
    const avgResolutionTime = resolvedTicketsData.reduce((acc, ticket) => {
      const resolutionTime = ticket.updatedAt - ticket.createdAt;
      return acc + resolutionTime;
    }, 0) / (resolvedTicketsData.length || 1);

    res.json({
      totalTickets,
      resolvedTickets,
      pendingTickets,
      avgResolutionTime,
      resolutionRate: (resolvedTickets / totalTickets) * 100
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAgentPerformance = async (req, res) => {
  try {
    const { startDate, endDate, agentId } = req.query;
    
    let query = { assignedTo: agentId };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const totalAssigned = await Ticket.countDocuments(query);
    const resolved = await Ticket.countDocuments({ ...query, status: 'Resuelto' });
    const avgResponseTime = await calculateAvgResponseTime(query);

    res.json({
      totalAssigned,
      resolved,
      resolutionRate: (resolved / totalAssigned) * 100,
      avgResponseTime
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategoryDistribution = async (req, res) => {
  try {
    const distribution = await Ticket.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(distribution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPriorityDistribution = async (req, res) => {
  try {
    const distribution = await Ticket.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(distribution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTimeSeriesData = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    let dateFormat;
    switch(groupBy) {
      case 'month':
        dateFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
        break;
      case 'week':
        dateFormat = { $dateToString: { format: "%Y-W%V", date: "$createdAt" } };
        break;
      default:
        dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    }

    const timeSeries = await Ticket.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: dateFormat,
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json(timeSeries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const calculateAvgResponseTime = async (query) => {
  const tickets = await Ticket.find(query);
  return tickets.reduce((acc, ticket) => {
    const responseTime = ticket.updatedAt - ticket.createdAt;
    return acc + responseTime;
  }, 0) / (tickets.length || 1);
};
