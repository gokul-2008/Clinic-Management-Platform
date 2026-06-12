import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';

// Create Doctor
export const createDoctor = async (req, res) => {
  try {
    const { name, specialty, phone, consultationFee, availability } = req.body;
    if (!name || !specialty || !phone || !consultationFee) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const doctor = new Doctor({
      name,
      specialty,
      phone,
      consultationFee,
      availability: availability || []
    });

    const saved = await doctor.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Doctors
export const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Doctor
export const updateDoctor = async (req, res) => {
  try {
    const isSelf = req.user.role === 'Doctor' && req.user.associatedId?.toString() === req.params.id;
    const isAdmin = req.user.role === 'Admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Access Denied: You are not authorized to update this profile.' });
    }

    const { name, specialty, phone, consultationFee, availability } = req.body;
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (isAdmin) {
      doctor.name = name || doctor.name;
      doctor.specialty = specialty || doctor.specialty;
      doctor.phone = phone || doctor.phone;
      doctor.consultationFee = consultationFee !== undefined ? consultationFee : doctor.consultationFee;
    }

    doctor.availability = availability || doctor.availability;

    const updated = await doctor.save();
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Doctor
export const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Cascade delete doctor's appointments
    await Appointment.deleteMany({ doctorId: req.params.id });
    await Doctor.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Doctor and their appointments deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
