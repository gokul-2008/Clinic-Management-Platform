import MedicalRecord from '../models/MedicalRecord.js';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Medicine from '../models/Medicine.js';

// Create Medical Record (with prescriptions and optional appointment status update)
export const createRecord = async (req, res) => {
  try {
    const { patientId, doctorId, vitals, diagnosis, prescriptions, notes, appointmentId } = req.body;
    if (!patientId || !doctorId || !diagnosis) {
      return res.status(400).json({ message: 'Patient, Doctor, and Diagnosis fields are required' });
    }

    const [patientExists, doctorExists] = await Promise.all([
      Patient.findById(patientId),
      Doctor.findById(doctorId)
    ]);

    if (!patientExists) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    if (!doctorExists) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const record = new MedicalRecord({
      patientId,
      doctorId,
      vitals: vitals || {},
      diagnosis,
      prescriptions: prescriptions || [],
      notes
    });

    const saved = await record.save();

    // Auto-deduct medicine from inventory stock
    if (prescriptions && prescriptions.length > 0) {
      for (const pr of prescriptions) {
        try {
          // Parse duration (e.g. "7 Days" -> 7) and frequency (e.g. "twice" -> 2)
          const durationMatch = pr.duration ? pr.duration.match(/\d+/) : null;
          const durationNum = durationMatch ? parseInt(durationMatch[0]) : 1;
          let freqMultiplier = 1;
          if (pr.frequency?.toLowerCase().includes('twice')) freqMultiplier = 2;
          else if (pr.frequency?.toLowerCase().includes('thrice')) freqMultiplier = 3;
          else if (pr.frequency?.toLowerCase().includes('4 hours')) freqMultiplier = 6;
          
          const qtyToDeduct = durationNum * freqMultiplier;
          
          // Find and deduct from stock case-insensitively
          await Medicine.findOneAndUpdate(
            { name: pr.drugName.toLowerCase().trim() },
            { $inc: { stock: -qtyToDeduct } }
          );
        } catch (stockErr) {
          console.error(`Failed to deduct stock for ${pr.drugName}:`, stockErr.message);
        }
      }
    }

    // If an appointmentId is provided, mark that appointment as Completed
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, { status: 'Completed' });
    }

    const populated = await MedicalRecord.findById(saved._id)
      .populate('patientId')
      .populate('doctorId', 'name specialty');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Medical Records
export const getRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find()
      .populate('patientId')
      .populate('doctorId', 'name specialty')
      .sort({ createdAt: -1 });
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Single Patient's Records
export const getPatientRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.params.patientId })
      .populate('patientId')
      .populate('doctorId', 'name specialty')
      .sort({ createdAt: -1 });
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Record
export const deleteRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }
    await MedicalRecord.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Medical record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Record
export const updateRecord = async (req, res) => {
  try {
    const { patientId, doctorId, vitals, diagnosis, prescriptions, notes } = req.body;
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    if (patientId) record.patientId = patientId;
    if (doctorId) record.doctorId = doctorId;
    record.vitals = vitals !== undefined ? vitals : record.vitals;
    record.diagnosis = diagnosis || record.diagnosis;
    record.prescriptions = prescriptions !== undefined ? prescriptions : record.prescriptions;
    record.notes = notes !== undefined ? notes : record.notes;

    const updated = await record.save();
    const populated = await MedicalRecord.findById(updated._id)
      .populate('patientId')
      .populate('doctorId', 'name specialty');

    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

