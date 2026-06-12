import mongoose from 'mongoose';

const billingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  services: {
    type: String,
    required: true,
    trim: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  }
}, {
  timestamps: true
});

const Billing = mongoose.model('Billing', billingSchema);
export default Billing;
