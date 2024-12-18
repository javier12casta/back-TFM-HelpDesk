import mongoose from 'mongoose';

const subCategoryDetailSchema = new mongoose.Schema({
  nombre_subcategoria_detalle: {
    type: String,
    required: true
  },
  descripcion: {
    type: String,
    required: true
  }
});

const subCategorySchema = new mongoose.Schema({
  nombre_subcategoria: {
    type: String,
    required: true
  },
  descripcion_subcategoria: {
    type: String,
    required: true
  },
  color_subcategoria: {
    type: String,
    required: true
  },
  subcategorias_detalle: [subCategoryDetailSchema]
});

const categorySchema = new mongoose.Schema({
  nombre_categoria: {
    type: String,
    required: true,
    sparse: true
  },
  descripcion_categoria: {
    type: String,
    required: true
  },
  color_categoria: {
    type: String,
    required: true
  },
  subcategorias: [subCategorySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Category', categorySchema); 