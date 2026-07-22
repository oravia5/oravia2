import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wisp')
  .then(async () => {
    const db = mongoose.connection.db;
    const posts = await db.collection('posts').find().sort({_id:-1}).limit(5).toArray();
    console.log('=== LATEST POSTS ===');
    console.log(JSON.stringify(posts.map(p => ({
      _id: p._id,
      type: p.type,
      mediaUrl: p.mediaUrl,
      thumbnailUrl: p.thumbnailUrl,
      caption: p.caption,
      createdAt: p.createdAt
    })), null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
