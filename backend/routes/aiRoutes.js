import express from 'express';
import { analyzePrescription } from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/analyze-prescription', protect, authorize('Doctor'), analyzePrescription);

export default router;
