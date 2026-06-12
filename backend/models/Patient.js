import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

patientSchema.pre('save', async function (next) {
  if (!this.patientId) {
    const lastPatient = await mongoose.model('Patient').findOne(
      { patientId: { $regex: /^PAT-\d+$/ } },
      {},
      { sort: { patientId: -1 } }
    );
    let nextSeq = 1;
    if (lastPatient && lastPatient.patientId) {
      const match = lastPatient.patientId.match(/PAT-(\d+)/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }
    const paddedSeq = String(nextSeq).padStart(4, '0');
    this.patientId = `PAT-${paddedSeq}`;
  }
  next();
});

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;

