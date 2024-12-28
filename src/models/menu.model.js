import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  path: {
    type: String,
    required: true,
    unique: true
  },
  icon: {
    type: String,
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Eliminar índices existentes antes de crear nuevos
menuSchema.pre('save', async function(next) {
  try {
    await mongoose.connection.collections.menus?.dropIndexes();
  } catch (error) {
    console.log('No hay índices para eliminar');
  }
  next();
});

const Menu = mongoose.model('Menu', menuSchema);
export default Menu; 