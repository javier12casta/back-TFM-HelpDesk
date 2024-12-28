import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['admin', 'user', 'supervisor', 'soporte', 'gerente']
  },
  description: {
    type: String,
    required: true
  },
  permissions: [{
    type: String,
    required: true
  }],
  menus: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

const Role = mongoose.model('Role', roleSchema);
export default Role; 