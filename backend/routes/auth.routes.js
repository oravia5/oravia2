import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  verifyRegisterOTP,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import upload, { validateUploadLimit } from '../middleware/upload.middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

router.post('/verify-otp', verifyRegisterOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
