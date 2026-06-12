import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  price: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true,
    default: 'tablets' // e.g. tablets, bottles, tubes
  }
}, {
  timestamps: true
});

const Medicine = mongoose.model('Medicine', medicineSchema);
export default Medicine;
