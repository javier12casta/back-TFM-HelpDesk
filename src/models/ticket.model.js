import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    nombre_subcategoria: {
      type: String,
      required: true
    },
    descripcion_subcategoria: String,
    subcategoria_detalle: {
      nombre_subcategoria_detalle: {
        type: String,
        required: true
      },
      descripcion: String
    }
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
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  attachment: {
    filename: String,
    path: String,
    mimetype: String
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      if (ret.attachment && ret.attachment.path) {
        delete ret.attachment.path;
      }
      return ret;
    }
  }
});

ticketSchema.virtual('attachment.downloadUrl').get(function() {
  if (this.attachment && this.attachment.path) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/${this.attachment.path}`;
  }
  return null;
});

export default mongoose.model('Ticket', ticketSchema);