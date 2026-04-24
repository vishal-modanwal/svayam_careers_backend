import { Router } from 'express';
import { login, getMe } from './auth.controller.js';
import { verifyToken } from '../../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me',     verifyToken, getMe);

export default router;