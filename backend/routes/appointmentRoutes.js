import express from 'express';
import { createAppointment, getAppointments, updateAppointment, deleteAppointment, getBookedSlots } from '../controllers/appointmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/booked-slots', protect, getBookedSlots);

router.route('/')
  .post(protect, authorize('Admin', 'Receptionist', 'Patient'), createAppointment)
  .get(protect, getAppointments);


router.route('/:id')
  .put(protect, authorize('Admin', 'Receptionist'), updateAppointment)
  .delete(protect, authorize('Admin'), deleteAppointment);

export default router;
