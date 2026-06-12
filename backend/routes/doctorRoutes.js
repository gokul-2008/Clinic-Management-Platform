import express from 'express';
import { createDoctor, getDoctors, updateDoctor, deleteDoctor } from '../controllers/doctorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, authorize('Admin'), createDoctor)
  .get(protect, getDoctors);

router.route('/:id')
  .put(protect, updateDoctor)
  .delete(protect, authorize('Admin'), deleteDoctor);

export default router;
