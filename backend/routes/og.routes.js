import express from 'express';
import Post from '../models/Post.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * Serves an HTML page with Open Graph meta tags for link previews
 * on WhatsApp, Telegram, Facebook, Twitter, etc.
 *
 * GET /og/post/:id
 */
router.get('/post/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username displayName avatarUrl');

    if (!post) {
      // Fallback: redirect to homepage
      return res.redirect('https://oravia.co.in/');
    }

    const author = post.author;
    const authorName = author?.displayName || author?.username || 'Oravia User';
    const caption = (post.caption || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').substring(0, 200);
    const title = caption ? `${authorName}: ${caption}` : `${authorName}'s post on Oravia`;
    const description = caption || `Check out this ${post.type} on Oravia — Connecting Moments`;

    // Resolve media URL to an absolute URL
    let imageUrl = post.mediaUrl || '';
    if (imageUrl.startsWith('/uploads/')) {
      imageUrl = `https://oravia.co.in${imageUrl}`;
    }

    // For videos, use thumbnailUrl if available, else use the video URL itself
    let ogType = 'article';
    let videoTag = '';
    if (post.type === 'video' || post.type === 'reel') {
      ogType = 'video.other';
      const videoUrl = imageUrl;
      videoTag = `
    <meta property="og:video" content="${videoUrl}" />
    <meta property="og:video:type" content="video/mp4" />
    <meta property="og:video:width" content="720" />
    <meta property="og:video:height" content="1280" />`;
      
      // Try to resolve a valid image thumbnail
      let thumbUrl = post.thumbnailUrl || '';
      if (thumbUrl && thumbUrl.startsWith('/uploads/')) {
        thumbUrl = `https://oravia.co.in${thumbUrl}`;
      }
      
      // If thumbnail is a video or empty, fall back to favicon/logo
      const isVideoFile = (url) => {
        const lower = (url || '').toLowerCase();
        return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.quicktime') || lower.endsWith('.webm');
      };

      if (thumbUrl && !isVideoFile(thumbUrl)) {
        imageUrl = thumbUrl;
      } else {
        imageUrl = 'https://oravia.co.in/favicon.png';
      }
    }

    const canonicalUrl = `https://oravia.co.in/post/${post._id}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />

    <!-- Open Graph -->
    <meta property="og:type" content="${ogType}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="Oravia" />${videoTag}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />

    <!-- Redirect real users to the SPA -->
    <meta http-equiv="refresh" content="0;url=${canonicalUrl}" />
</head>
<body>
    <p>Redirecting to <a href="${canonicalUrl}">Oravia</a>...</p>
</body>
</html>`;

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('OG meta generation error:', error.message);
    res.redirect('https://oravia.co.in/');
  }
});

export default router;
