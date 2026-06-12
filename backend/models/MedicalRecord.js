import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  drugName: { type: String, required: true, trim: true },
  dosage: { type: String, required: true, trim: true },
  frequency: { type: String, required: true, trim: true }, // e.g. "Twice a day"
  duration: { type: String, required: true, trim: true } // e.g. "7 Days"
}, { _id: false });

const medicalRecordSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    unique: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  vitals: {
    bloodPressure: { type: String, trim: true },
    heartRate: { type: Number },
    weight: { type: Number }
  },
  diagnosis: {
    type: String,
    required: true,
    trim: true
  },
  prescriptions: [prescriptionSchema],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

medicalRecordSchema.pre('save', async function (next) {
  if (!this.prescriptionId) {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.prescriptionId = `RX-${year}-${randomNum}`;
  }
  next();
});


const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
export default MedicalRecord;
