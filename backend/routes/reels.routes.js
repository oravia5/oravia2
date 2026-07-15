import express from 'express';
import { getReels, createReel } from '../controllers/reels.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { postUpload, validateUploadLimit } from '../middleware/upload.middleware.js';

const router = express.Router();

router.get('/', getReels);
router.post('/', protect, postUpload, validateUploadLimit, createReel);

export default router;
