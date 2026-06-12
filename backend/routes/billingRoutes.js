import express from 'express';
import { createBill, getBills, updateBill, deleteBill } from '../controllers/billingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, authorize('Admin'), createBill)
  .get(protect, getBills);

router.route('/:id')
  .put(protect, authorize('Admin'), updateBill)
  .delete(protect, authorize('Admin'), deleteBill);

export default router;
