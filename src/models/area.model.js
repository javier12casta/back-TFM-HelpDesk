import mongoose from 'mongoose';

const areaSchema = new mongoose.Schema({
  area: {
    type: String,
    required: true,
    unique: true
  },
  detalle: {
    type: [String],
    default: []
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

export default mongoose.model('Area', areaSchema); 