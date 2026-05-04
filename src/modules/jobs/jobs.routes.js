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


const router = Router();

// ── Static routes ──────────────────────
router.get('/designations', getDesignations);
router.get('/skills',       getAllSkills);
router.get('/all',         getAllJobs);

// ── Public routes ─────────────────────────────
router.get('/',    getPublishedJobs);
router.get('/:id', getJobById);

// ── Admin routes ──────────────────────────────
router.post('/',    verifyToken,  createJob);
router.put('/:id', verifyToken, updateJob);
router.patch('/:id/status', verifyToken, updateJobStatus);
router.delete('/:id', verifyToken, deleteJob);

export default router;