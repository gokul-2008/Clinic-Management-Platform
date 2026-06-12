import Document from '../models/Document.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Multet Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File upload instance
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|jpg|jpeg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Validation Failed: Only PDFs, JPGs, and PNGs are allowed.'));
  }
});

// Save Document details
export const createDocument = async (req, res) => {
  try {
    const { patientId, title } = req.body;
    if (!patientId || !title || !req.file) {
      return res.status(400).json({ message: 'Title, patientId, and file are required.' });
    }

    // Relative url to serve statically
    const fileUrl = `/uploads/${req.file.filename}`;

    const document = new Document({
      patientId,
      title,
      fileUrl,
      fileType: req.file.mimetype,
      uploadedBy: req.user.email
    });

    const saved = await document.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// List patient's diagnostic documents
export const getPatientDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    res.status(200).json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Purge Document
export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Unlink file from physical disk
    const filePath = path.join('.', doc.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Document.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
