import express from 'express';
import { toggleWishlistProduct, getWishlistProducts } from '../controllers/products.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/wishlist', protect, toggleWishlistProduct);
router.get('/wishlist', protect, getWishlistProducts);

export default router;
