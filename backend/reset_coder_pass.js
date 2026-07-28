import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

await mongoose.connect('mongodb://127.0.0.1:27017/wisp');
const db = mongoose.connection.db;

const hashedPassword = await bcrypt.hash('password123', 10);
const res = await db.collection('users').updateOne(
  { username: 'wisp_coder' },
  { $set: { password: hashedPassword, isVerified: true } }
);

console.log('Password reset result for wisp_coder:', res);
await mongoose.disconnect();
