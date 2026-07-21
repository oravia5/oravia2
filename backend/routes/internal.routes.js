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

    const existingPost = await Post.findOne({
      $or: [
        { mediaUrl: { $regex: fileKey, $options: 'i' } },
        { thumbnailUrl: { $regex: fileKey, $options: 'i' } },
        { 'mediaItems.url': { $regex: fileKey, $options: 'i' } },
        { 'mediaItems.thumbnailUrl': { $regex: fileKey, $options: 'i' } },
      ],
    });

    if (!existingPost) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const finalNSFW = existingPost.isNSFW === true || isNSFW === true;

    const result = await Post.findOneAndUpdate(
      { _id: existingPost._id },
      { isNSFW: finalNSFW, moderationStatus: 'completed' },
      { new: true }
    );

    console.log(`Moderation updated for post ${result._id}: isNSFW=${result.isNSFW} (this call sent: ${isNSFW})`);
    return res.json({ success: true, isNSFW: result.isNSFW });
  } catch (err) {
    console.error('update-moderation error:', err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
});

export default router;
