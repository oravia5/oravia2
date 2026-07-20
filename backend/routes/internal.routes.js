import express from 'express';
import Post from '../models/Post.js';

const router = express.Router();

router.post('/update-moderation', async (req, res) => {
  try {
    if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { fileKey, isNSFW } = req.body;
    if (!fileKey) {
      return res.status(400).json({ success: false, message: 'fileKey required' });
    }

    const result = await Post.findOneAndUpdate(
      {
        $or: [
          { mediaUrl: { $regex: fileKey, $options: 'i' } },
          { 'mediaItems.url': { $regex: fileKey, $options: 'i' } },
        ],
      },
      { isNSFW, moderationStatus: 'completed' },
      { new: true }
    );

    if (!result) {
      console.log(`No post found matching fileKey: ${fileKey}`);
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    console.log(`Moderation updated for post ${result._id}: isNSFW=${isNSFW}`);
    res.json({ success: true, postId: result._id, isNSFW });
  } catch (err) {
    console.error('Moderation update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
