import express from 'express';
import { createRecord, getRecords, getPatientRecords, deleteRecord, updateRecord } from '../controllers/recordController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, authorize('Doctor'), createRecord)
  .get(protect, getRecords);

router.route('/patient/:patientId')
  .get(protect, getPatientRecords);

router.route('/:id')
  .put(protect, authorize('Doctor', 'Admin'), updateRecord)
  .delete(protect, authorize('Admin', 'Doctor'), deleteRecord);

export default router;

