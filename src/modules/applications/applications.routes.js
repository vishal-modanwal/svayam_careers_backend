import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  submitApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus
} from './applications.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { allow }       from '../../middleware/authorization.js';

// Multer config
const storage = multer.diskStorage({
  destination: 'src/uploads/',
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    cb(null, `resume_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX allowed'));
    }
  }
});

const router = Router();

// Public — koi bhi apply kar sakta hai
router.post('/', upload.single('resume'), submitApplication);

// Admin only
router.get('/',    verifyToken, allow('admin'), getAllApplications);
router.get('/:id', verifyToken, allow('admin'), getApplicationById);
router.patch('/:id/status', verifyToken, allow('admin'), updateApplicationStatus);

export default router;