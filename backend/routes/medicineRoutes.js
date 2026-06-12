import express from 'express';
import { createMedicine, getMedicines, updateMedicine, deleteMedicine } from '../controllers/medicineController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, authorize('Admin'), createMedicine)
  .get(protect, getMedicines);

router.route('/:id')
  .put(protect, authorize('Admin'), updateMedicine)
  .delete(protect, authorize('Admin'), deleteMedicine);

export default router;
