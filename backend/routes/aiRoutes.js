import express from 'express';
import { analyzePrescription, checkSymptoms, summarizeReport, healthcareChatbot } from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/analyze-prescription', protect, authorize('Doctor'), analyzePrescription);
router.post('/check-symptoms', protect, authorize('Patient'), checkSymptoms);
router.post('/summarize-report', protect, authorize('Doctor', 'Admin'), summarizeReport);
router.post('/chatbot', protect, authorize('Patient'), healthcareChatbot);

export default router;
