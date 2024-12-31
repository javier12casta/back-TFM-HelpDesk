import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  attachment: {
    filename: String,
    path: String,
    mimetype: String
  },
  statusChange: {
    oldStatus: String,
    newStatus: String
  },
  createdAt: {
    type: Date,
    default: Date.now
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

// Agregar virtual para la URL de descarga
commentSchema.virtual('attachment.downloadUrl').get(function() {
  if (this.attachment && this.attachment.path) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/${this.attachment.path}`;
  }
  return null;
});

const Comment = mongoose.model('Comment', commentSchema);

export default Comment; 