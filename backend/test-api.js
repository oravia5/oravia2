import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Load env variables manually for testing
process.env.PORT = 5001;
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/wisp_test';
process.env.JWT_SECRET = 'test_secret_key_123';
process.env.UPLOAD_DIR = './uploads_test';

// Clean up upload dir test and mock db file
if (fs.existsSync('./uploads_test')) {
  fs.rmSync('./uploads_test', { recursive: true, force: true });
}
const dbDataPath = './db_data.json';
if (fs.existsSync(dbDataPath)) {
  fs.unlinkSync(dbDataPath);
}


// Start Express server programmatically by importing it after setting env variables
const startServer = async () => {
  // Ensure we dynamic import server so env values are registered
  await import('./server.js');
  // Wait a moment for DB connection
  await new Promise((resolve) => setTimeout(resolve, 2000));
};

const BASE_URL = 'http://127.0.0.1:5001/api';

async function runTests() {
  console.log('--- STARTING BACKEND INTEGRATION TESTS ---');
  let token1 = '';
  let token2 = '';
  let userId1 = '';
  let userId2 = '';
  let postId = '';
  let commentId = '';

  try {
    // Clean up database
    const db = mongoose.connection.db;
    await db.collection('users').deleteMany({ username: { $in: ['alice', 'bob'] } });
    await db.collection('otps').deleteMany({ email: { $in: ['alice@wisp.com', 'bob@wisp.com'] } });

    // 1. Check server status
    const statusRes = await fetch('http://127.0.0.1:5001/');
    const statusData = await statusRes.json();
    console.log('✓ Server Status:', statusData);

    // 2. Register Test User 1
    const regRes1 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        email: 'alice@wisp.com',
        phone: '1234567890',
        password: 'password123',
        displayName: 'Alice Cooper',
        bio: 'Hello, I am Alice!'
      }),
    });
    const regData1 = await regRes1.json();
    if (!regData1.success) throw new Error(`Registration failed: ${regData1.message}`);
    console.log('✓ Register User 1 requested OTP');

    // Retrieve OTP for Alice and verify
    let otpAlice = await db.collection('otps').findOne({ email: 'alice@wisp.com', purpose: 'register' });
    if (!otpAlice) throw new Error('OTP not found for Alice');
    const verifyRes1 = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@wisp.com', code: otpAlice.code }),
    });
    const verifyData1 = await verifyRes1.json();
    if (!verifyData1.success) throw new Error(`Verification failed for Alice: ${verifyData1.message}`);
    token1 = verifyData1.data.token;
    userId1 = verifyData1.data._id;
    console.log('✓ Verify User 1 successful');

    // 3. Register Test User 2
    const regRes2 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'bob',
        email: 'bob@wisp.com',
        phone: '0987654321',
        password: 'password123',
        displayName: 'Bob Builder',
        bio: 'Can we build it?'
      }),
    });
    const regData2 = await regRes2.json();
    if (!regData2.success) throw new Error(`Registration failed for Bob: ${regData2.message}`);
    console.log('✓ Register User 2 requested OTP');

    // Retrieve OTP for Bob and verify
    let otpBob = await db.collection('otps').findOne({ email: 'bob@wisp.com', purpose: 'register' });
    if (!otpBob) throw new Error('OTP not found for Bob');
    const verifyRes2 = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob@wisp.com', code: otpBob.code }),
    });
    const verifyData2 = await verifyRes2.json();
    if (!verifyData2.success) throw new Error(`Verification failed for Bob: ${verifyData2.message}`);
    token2 = verifyData2.data.token;
    userId2 = verifyData2.data._id;
    console.log('✓ Verify User 2 successful');

    // 4. Login User 1
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'alice',
        password: 'password123',
      }),
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error(`Login failed: ${loginData.message}`);
    console.log('✓ Login User 1 successful');

    // 5. Get current user (Verify JWT)
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token1}` },
    });
    const meData = await meRes.json();
    if (!meData.success) throw new Error(`Auth Me failed: ${meData.message}`);
    console.log('✓ Auth Me verification successful for:', meData.data.username);

    // 6. Follow User 2 (Alice follows Bob)
    const followRes = await fetch(`${BASE_URL}/users/${userId2}/follow`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` },
    });
    const followData = await followRes.json();
    console.log('✓ Follow functionality:', followData.message);

    // Verify Bob's profile contains follower count of 1 and isFollowing: true when fetched by Alice
    const bobProfileRes = await fetch(`${BASE_URL}/users/bob`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const bobProfile = await bobProfileRes.json();
    console.log('✓ Bob profile check (Follower count):', bobProfile.data.followerCount);
    console.log('✓ Bob profile check (isFollowing):', bobProfile.data.isFollowing);
    if (bobProfile.data.followerCount !== 1) throw new Error('Follow count incorrect');
    if (bobProfile.data.isFollowing !== true) throw new Error('isFollowing status incorrect');

    // 7. Create a mock post (using multipart/form-data via global FormData)
    // We create a mock text file as binary upload for Multer
    const mockFileContent = 'fake-image-binary-data';
    const blob = new Blob([mockFileContent], { type: 'image/png' });
    const formData = new FormData();
    formData.append('media', blob, 'test-image.png');
    formData.append('caption', 'My first photo post!');
    formData.append('location', 'San Francisco');
    formData.append('type', 'photo');

    const createPostRes = await fetch(`${BASE_URL}/posts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` },
      body: formData,
    });
    const postData = await createPostRes.json();
    if (!postData.success) throw new Error(`Post creation failed: ${postData.message}`);
    postId = postData.data._id;
    console.log('✓ Create Post successful. ID:', postId);

    // 8. Like Post (Bob likes Alice's post)
    const likeRes = await fetch(`${BASE_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` },
    });
    const likeData = await likeRes.json();
    console.log('✓ Like Post response:', likeData.data);
    if (!likeData.data.likes.includes(userId2)) throw new Error('Like was not registered');

    // 9. Dislike Post (Bob toggles to Dislike Alice's post)
    const dislikeRes = await fetch(`${BASE_URL}/posts/${postId}/dislike`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` },
    });
    const dislikeData = await dislikeRes.json();
    console.log('✓ Dislike Post response (Like should be removed):', dislikeData.data);
    if (dislikeData.data.likes.includes(userId2) || !dislikeData.data.dislikes.includes(userId2)) {
      throw new Error('Mutual exclusion of likes/dislikes failed');
    }

    // 10. Add Comment (Bob comments on Alice's post)
    const commentRes = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token2}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: 'Nice post, Alice!' }),
    });
    const commentData = await commentRes.json();
    commentId = commentData.data._id;
    console.log('✓ Add Comment successful:', commentData.data.text);

    // 11. Fetch comments
    const listCommentsRes = await fetch(`${BASE_URL}/posts/${postId}/comments`);
    const listCommentsData = await listCommentsRes.json();
    console.log('✓ List comments count:', listCommentsData.data.length);
    if (listCommentsData.data.length !== 1) throw new Error('Comments list length incorrect');

    // 12. Save Post (Bob bookmarks Alice's post)
    const saveRes = await fetch(`${BASE_URL}/posts/${postId}/save`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` },
    });
    const saveData = await saveRes.json();
    console.log('✓ Save Post response:', saveData.message);

    // 13. Get Feed (Alice gets feed, Bob is followed, also retrieves own posts)
    const feedRes = await fetch(`${BASE_URL}/posts/feed`, {
      headers: { 'Authorization': `Bearer ${token1}` },
    });
    const feedData = await feedRes.json();
    console.log('✓ Fetch Feed item count:', feedData.data.length);

    // 14. Share Post (Alice shares post)
    const shareRes = await fetch(`${BASE_URL}/posts/${postId}/share`, {
      method: 'POST',
    });
    const shareData = await shareRes.json();
    console.log('✓ Share Post link:', shareData.data.shareableUrl);

    // 15. Delete Comment (Bob deletes comment)
    const delCommentRes = await fetch(`${BASE_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token2}` },
    });
    const delCommentData = await delCommentRes.json();
    console.log('✓ Delete comment response:', delCommentData.message);

    console.log('\n=========================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('=========================================');
    process.exit(0);

  } catch (error) {
    console.error('❌ Integration Test Failed:', error);
    process.exit(1);
  }
}

// Start and run tests
startServer().then(() => {
  runTests();
});
