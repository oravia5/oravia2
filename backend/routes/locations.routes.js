import express from 'express';
import { searchLocations } from '../controllers/locations.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', protect, searchLocations);

export default router;
