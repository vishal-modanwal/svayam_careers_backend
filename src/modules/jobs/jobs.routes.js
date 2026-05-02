import { Router } from 'express';
import {
  getPublishedJobs,
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  getDesignations,
  getAllSkills
} from './jobs.controller.js';
import { verifyToken } from '../../middleware/auth.js';

import { allow }       from '../../middleware/authorization.js';

const router = Router();

// ── Static routes ──────────────────────
router.get('/designations', getDesignations);
router.get('/skills',       getAllSkills);
router.get('/all',         allow('admin'), getAllJobs);

// ── Public routes ─────────────────────────────
router.get('/',    getPublishedJobs);
router.get('/:id', getJobById);

// ── Admin routes ──────────────────────────────
router.post('/',    verifyToken, allow('admin'), createJob);
router.put('/:id', verifyToken, allow('admin'), updateJob);
router.patch('/:id/status', verifyToken, allow('admin'), updateJobStatus);
router.delete('/:id', verifyToken, allow('admin'), deleteJob);

export default router;