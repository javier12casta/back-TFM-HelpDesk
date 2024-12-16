import mongoose from 'mongoose';

const ticketHistorySchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changeType: {
    type: String,
    required: true,
    enum: ['CREATED', 'UPDATED', 'STATUS_CHANGE', 'PRIORITY_CHANGE', 'ASSIGNMENT_CHANGE']
  },
  changes: {
    previous: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    current: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String,
  notes: String
});

export default mongoose.model('TicketHistory', ticketHistorySchema); 