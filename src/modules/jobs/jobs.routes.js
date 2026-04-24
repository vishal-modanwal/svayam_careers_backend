import { Router } from 'express';
import {
  getPublishedJobs, getAllJobs, getJobById,
  createJob, updateJob, updateJobStatus, deleteJob
} from './jobs.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { allow }       from '../../middleware/authorization.js';

const router = Router();

// ── Public routes ──────────────────────────────
router.get('/',         getPublishedJobs);  // published jobs + filters
router.get('/all',      verifyToken, allow('admin'), getAllJobs);
router.get('/:id',      getJobById);

// ── Admin routes ───────────────────────────────
router.post('/',        verifyToken, allow('admin'), createJob);
router.put('/:id',      verifyToken, allow('admin'), updateJob);
router.patch('/:id/status', verifyToken, allow('admin'), updateJobStatus);
router.delete('/:id',   verifyToken, allow('admin'), deleteJob);

export default router;