import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import Billing from '../models/Billing.js';
import MedicalRecord from '../models/MedicalRecord.js';
import User from '../models/User.js';

// Create Patient
export const createPatient = async (req, res) => {
  try {
    const { patientId, name, age, gender, phone, address } = req.body;
    if (!name || !age || !gender || !phone || !address) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (patientId) {
      const existing = await Patient.findOne({ patientId });
      if (existing) {
        return res.status(400).json({ message: `Patient ID "${patientId}" is already in use.` });
      }
    }
    const patient = new Patient({ patientId, name, age, gender, phone, address });
    const saved = await patient.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Patients
export const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.status(200).json(patients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Patient by ID (including visit history)
export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Fetch visits (medical records), appointments, and bills for this patient
    const records = await MedicalRecord.find({ patientId: patient._id })
      .populate('doctorId', 'name specialty')
      .sort({ createdAt: -1 });

    const appointments = await Appointment.find({ patientId: patient._id })
      .populate('doctorId', 'name specialty')
      .sort({ date: -1 });

    const bills = await Billing.find({ patientId: patient._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      patient,
      records,
      appointments,
      bills
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Patient
export const updatePatient = async (req, res) => {
  try {
    const isSelf = req.user.role === 'Patient' && req.user.associatedId?.toString() === req.params.id;
    const isAdminOrStaff = req.user.role === 'Admin' || req.user.role === 'Receptionist';

    if (!isSelf && !isAdminOrStaff) {
      return res.status(403).json({ message: 'Access Denied: You are not authorized to update this profile.' });
    }

    const { name, age, gender, phone, address } = req.body;
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    patient.name = name || patient.name;
    patient.age = age !== undefined ? age : patient.age;
    patient.gender = gender || patient.gender;
    patient.phone = phone || patient.phone;
    patient.address = address || patient.address;

    const updated = await patient.save();
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Delete Patient (Cascade delete appointments, bills, and medical records)
export const deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    await Appointment.deleteMany({ patientId: req.params.id });
    await Billing.deleteMany({ patientId: req.params.id });
    await MedicalRecord.deleteMany({ patientId: req.params.id });
    await User.deleteMany({ associatedId: req.params.id }); // Clean up login accounts
    await Patient.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Patient and all clinical history deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
