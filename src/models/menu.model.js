import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true
  },
  ruta: {
    type: String,
    required: true,
    unique: true
  },
  icono: {
    type: String,
    required: true
  },
  orden: {
    type: Number,
    required: true
  },
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
});

export default mongoose.model('Menu', menuSchema); 