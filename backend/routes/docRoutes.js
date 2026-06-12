import express from 'express';
import { createDocument, getPatientDocuments, deleteDocument, upload } from '../controllers/docController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/upload', protect, upload.single('file'), createDocument);
router.get('/patient/:patientId', protect, getPatientDocuments);
router.delete('/:id', protect, deleteDocument);

export default router;
