import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from './models/Post.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI / MONGODB_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const posts = await Post.find({
    $or: [{ randomOrder: { $exists: false } }, { randomOrder: null }],
  }).select('_id');

  console.log(`Found ${posts.length} posts without randomOrder`);

  let updated = 0;
  for (const post of posts) {
    await Post.updateOne(
      { _id: post._id },
      { $set: { randomOrder: Math.random() } }
    );
    updated++;
  }

  console.log(`Done. Updated ${updated} posts.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
