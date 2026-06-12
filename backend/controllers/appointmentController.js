import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';

// Create Appointment
export const createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, date, time, status } = req.body;
    if (!patientId || !doctorId || !date || !time) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Verify patient and doctor exist
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

    // Prevent Double Booking
    const bookingDate = new Date(date);
    const startOfDay = new Date(bookingDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(bookingDate.setHours(23, 59, 59, 999));

    const existingBooking = await Appointment.findOne({
      doctorId,
      time,
      status: { $ne: 'Cancelled' },
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'Double Booking Blocked: The selected doctor already has a confirmed session at this date and time slot.' });
    }

    const appointment = new Appointment({
      patientId,
      doctorId,
      date,
      time,
      status: status || 'Booked'
    });

    const saved = await appointment.save();

    const populated = await Appointment.findById(saved._id)
      .populate('patientId')
      .populate('doctorId', 'name specialty consultationFee');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Appointments
export const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('patientId')
      .populate('doctorId', 'name specialty consultationFee')
      .sort({ date: 1, time: 1 });
    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Appointment
export const updateAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, status } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (doctorId) {
      const doctorExists = await Doctor.findById(doctorId);
      if (!doctorExists) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      appointment.doctorId = doctorId;
    }

    appointment.date = date || appointment.date;
    appointment.time = time || appointment.time;
    appointment.status = status || appointment.status;

    const updated = await appointment.save();
    const populated = await Appointment.findById(updated._id)
      .populate('patientId')
      .populate('doctorId', 'name specialty');

    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Appointment
export const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    await Appointment.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Booked Slots for a doctor on a specific date
export const getBookedSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ message: 'Doctor ID and Date are required query parameters' });
    }

    const bookingDate = new Date(date);
    const startOfDay = new Date(bookingDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(bookingDate.setHours(23, 59, 59, 999));

    const bookedAppointments = await Appointment.find({
      doctorId,
      status: { $ne: 'Cancelled' },
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    const slots = bookedAppointments.map(a => a.time);
    res.status(200).json(slots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

