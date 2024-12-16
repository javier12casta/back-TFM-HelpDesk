import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Atención al Cliente', 'Operaciones Bancarias', 'Reclamos', 'Servicios Digitales']
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Pendiente', 'En Proceso', 'Resuelto', 'Cancelado'],
    default: 'Pendiente'
  },
  priority: {
    type: String,
    required: true,
    enum: ['Baja', 'Media', 'Alta'],
    default: 'Media'
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Ticket', ticketSchema);