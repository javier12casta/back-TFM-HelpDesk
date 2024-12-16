import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['TICKETS', 'PERFORMANCE', 'CATEGORIES', 'AGENTS']
  },
  filters: {
    dateRange: {
      startDate: Date,
      endDate: Date
    },
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    priority: [{
      type: String,
      enum: ['Baja', 'Media', 'Alta']
    }],
    status: [{
      type: String,
      enum: ['Pendiente', 'En Proceso', 'Resuelto', 'Cancelado']
    }]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'NONE'],
      default: 'NONE'
    },
    lastRun: Date,
    nextRun: Date
  }
});

export default mongoose.model('Report', reportSchema);
