import mongoose from 'mongoose';

await mongoose.connect('mongodb://127.0.0.1:27017/wisp');
const db = mongoose.connection.db;

const emails = ['mukesh0503kr@gmail.com', 'krold.mukeshkumar@gmail.com'];
const users = await db.collection('users').find(
  { email: { $in: emails } },
  { projection: { username: 1, email: 1, displayName: 1, _id: 1 } }
).toArray();

console.log('Found users:', JSON.stringify(users, null, 2));

const total = await db.collection('users').countDocuments();
console.log('Total users in local DB:', total);

// List all users
const allUsers = await db.collection('users').find({}, { projection: { username: 1, email: 1, _id: 0 } }).toArray();
console.log('\nAll users in local DB:');
allUsers.forEach(u => console.log(`  - ${u.username} (${u.email})`));

await mongoose.disconnect();
