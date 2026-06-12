import express from 'express';
import { createCheckoutSession, confirmPayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/checkout-session/:billId', protect, createCheckoutSession);
router.post('/confirm/:billId', protect, confirmPayment);

export default router;
