import Ticket from '../models/ticket.model.js';
import ExcelJS from 'exceljs';

export const getTicketStats = async (req, res) => {
  try {
    const { startDate, endDate, area, category } = req.query;
    
    let query = {};
    
    // Filtros de fecha
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate + 'T00:00:00.000Z'),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }
    
    // Filtro por área
    if (area) {
      query.area = area;
    }
    
    // Filtro por categoría
    if (category) {
      query.category = category;
    }

    // Estadísticas generales
    const totalTickets = await Ticket.countDocuments(query);
    const resolvedTickets = await Ticket.countDocuments({ ...query, status: 'Resuelto' });
    const pendingTickets = await Ticket.countDocuments({ ...query, status: 'Pendiente' });
    const inProgressTickets = await Ticket.countDocuments({ ...query, status: 'En Proceso' });
    
    // Tiempo promedio de resolución (en horas)
    const resolvedTicketsData = await Ticket.find({ 
      ...query, 
      status: 'Resuelto' 
    });
    
    const avgResolutionTime = resolvedTicketsData.reduce((acc, ticket) => {
      const resolutionTime = (ticket.updatedAt - ticket.createdAt) / (1000 * 60 * 60); // Convertir a horas
      return acc + resolutionTime;
    }, 0) / (resolvedTicketsData.length || 1);

    res.json({
      totalTickets,
      resolvedTickets,
      pendingTickets,
      inProgressTickets,
      avgResolutionTime: Math.round(avgResolutionTime * 100) / 100, // Redondear a 2 decimales
      resolutionRate: Math.round((resolvedTickets / totalTickets) * 100 * 100) / 100
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAreaStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate + 'T00:00:00.000Z'),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    const areaStats = await Ticket.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$area',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'Resuelto'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'Pendiente'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'En Proceso'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'areas',
          localField: '_id',
          foreignField: '_id',
          as: 'areaInfo'
        }
      },
      {
        $project: {
          area: { $arrayElemAt: ['$areaInfo.area', 0] },
          total: 1,
          resolved: 1,
          pending: 1,
          inProgress: 1,
          resolutionRate: {
            $multiply: [
              { $divide: ['$resolved', { $cond: [{ $eq: ['$total', 0] }, 1, '$total'] }] },
              100
            ]
          }
        }
      }
    ]);

    res.json(areaStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategoryStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate + 'T00:00:00.000Z'),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    const categoryStats = await Ticket.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: { $arrayElemAt: ['$categoryInfo.nombre_categoria', 0] } },
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'Resuelto'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'Pendiente'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'En Proceso'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          categoryName: 1,
          total: 1,
          resolved: 1,
          pending: 1,
          inProgress: 1,
          resolutionRate: {
            $multiply: [
              { $divide: ['$resolved', { $cond: [{ $eq: ['$total', 0] }, 1, '$total'] }] },
              100
            ]
          }
        }
      }
    ]);

    res.json(categoryStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadExcelReport = async (req, res) => {
  try {
    const { startDate, endDate, area, category } = req.query;
    
    let query = {};
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate + 'T00:00:00.000Z'),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }
    
    if (area) query.area = area;
    if (category) query.category = category;

    const tickets = await Ticket.find(query)
      .populate('area', 'area')
      .populate('assignedTo', 'name email')
      .populate('category', 'nombre_categoria')
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tickets Report');

    // Definir columnas
    worksheet.columns = [
      { header: 'Ticket ID', key: 'ticketId', width: 30 },
      { header: 'Título', key: 'title', width: 30 },
      { header: 'Descripción', key: 'description', width: 40 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Área', key: 'areaName', width: 20 },
      { header: 'Categoría', key: 'categoryName', width: 20 },
      { header: 'Subcategoría', key: 'subcategoryName', width: 20 },
      { header: 'Prioridad', key: 'priority', width: 15 },
      { header: 'Asignado a', key: 'assignedToName', width: 25 },
      { header: 'Fecha de creación', key: 'createdAt', width: 30 },
      { header: 'Última actualización', key: 'updatedAt', width: 30 }
    ];

    // Agregar datos
    tickets.forEach(ticket => {
      worksheet.addRow({
        ticketId: ticket.ticketNumber,
        title: ticket.ticketNumber,
        description: ticket.description,
        status: ticket.status,
        areaName: ticket.area?.area || 'N/A',
        categoryName: ticket.category?.nombre_categoria || 'N/A',
        subcategoryName: ticket.subcategory?.nombre_subcategoria || 'N/A',
        priority: ticket.priority,
        assignedToName: ticket.assignedTo?.name || 'No asignado',
        createdAt: ticket.createdAt.toLocaleString(),
        updatedAt: ticket.updatedAt.toLocaleString()
      });
    });

    // Estilo para el encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Ajustar el ancho de las columnas automáticamente
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 10, 15);
    });

    // Generar el archivo en memoria y enviarlo directamente como respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=tickets-report.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error en downloadExcelReport:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
