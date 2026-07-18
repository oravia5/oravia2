import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const promoteUser = async () => {
  const identifier = process.argv[2];

  if (!identifier) {
    console.error('❌ Please provide a username or email to promote to superadmin.');
    console.log('Usage: node seed-admin.js <username_or_email>');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wisp';
  console.log(`Connecting to MongoDB...`);

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to Database.');

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
    });

    if (!user) {
      console.error(`❌ User not found with username or email: "${identifier}"`);
      process.exit(1);
    }

    user.role = 'superadmin';
    user.isVerified = true; // Make sure admin is verified
    user.isBanned = false; // Make sure admin is not banned
    await user.save();

    console.log(`\n🎉 Success! User "${user.username}" (${user.email}) has been promoted to superadmin!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }
};

promoteUser();
