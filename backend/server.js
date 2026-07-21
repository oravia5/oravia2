import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Post from './models/Post.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import postsRoutes from './routes/posts.routes.js';
import reelsRoutes from './routes/reels.routes.js';
import commentsRoutes from './routes/comments.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import locationRoutes from './routes/locations.routes.js';
import productsRoutes from './routes/products.routes.js';
import chatRoutes from './routes/chat.routes.js';
import adminRoutes from './routes/admin.routes.js';
import ogRoutes from './routes/og.routes.js';
import internalRoutes from './routes/internal.routes.js';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded static files only when NOT using S3
if (!process.env.AWS_BUCKET_NAME) {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
}

// Serve stickers folder statically
app.use('/stickers', express.static(path.join(process.cwd(), 'stickers')));

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/reels', reelsRoutes);
// Comments router has prefix paths /posts and /comments directly
app.use('/api', commentsRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Location suggestions routes
app.use('/api/locations', locationRoutes);

// Wishlist products routes
app.use('/api/products', productsRoutes);

// Chat routes
app.use('/api/chat', chatRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// OG Preview routes
app.use('/og', ogRoutes);

// Dynamic sitemap generation
app.get('/sitemap.xml', async (req, res) => {
  try {
    const users = await User.find({}, 'username updatedAt');
    const posts = await Post.find({ isDraft: { $ne: true }, isArchived: { $ne: true } }, '_id updatedAt');

    const baseUrl = 'https://oravia.co.in';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/snips</loc>
    <changefreq>always</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/search</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;

    users.forEach(user => {
      const dateStr = user.updatedAt ? user.updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      xml += `  <url>
    <loc>${baseUrl}/profile/${user.username}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    });

    posts.forEach(post => {
      const dateStr = post.updatedAt ? post.updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      xml += `  <url>
    <loc>${baseUrl}/post/${post._id}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
    });

    xml += `</urlset>`;

    res.set('Content-Type', 'text/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Internal moderation routes
app.use('/api/internal', internalRoutes);

// Base route for status verification
app.get('/', (req, res) => {
  res.json({ message: 'Wisp API Server is running...' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
