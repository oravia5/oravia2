import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_URL = 'http://127.0.0.1:5000/api';
const DB_URI = 'mongodb://127.0.0.1:27017/wisp';

async function runTest() {
  console.log('🧪 Starting Live End-to-End Server & Database Integration Test...\n');
  
  await mongoose.connect(DB_URI);
  console.log('✅ Connected to remote MongoDB.\n');

  const db = mongoose.connection.db;

  // Clean old test data
  await db.collection('users').deleteMany({ email: /live_test_user/ });
  await db.collection('otps').deleteMany({ email: /live_test_user/ });

  const user1 = {
    username: 'live_test_user_1',
    email: 'live_test_user_1@oravia.com',
    password: 'password123',
    phone: '1234567890',
  };

  const user2 = {
    username: 'live_test_user_2',
    email: 'live_test_user_2@oravia.com',
    password: 'password123',
    phone: '0987654321',
  };

  let token1, token2, user1Id, user2Id;

  try {
    // ===== STEP 1: Register User 1 =====
    console.log('📝 Step 1: Registering live_test_user_1...');
    const reg1 = await (await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user1)
    })).json();
    console.log('   Result:', reg1.message);
    if (!reg1.success) throw new Error('Registration user 1 failed');

    // ===== STEP 2: Get OTP & Verify User 1 =====
    console.log('🔑 Step 2: Fetching OTP from DB & verifying user 1...');
    const otp1 = await db.collection('otps').findOne({ email: user1.email, purpose: 'register' });
    if (!otp1) throw new Error('OTP not found for user 1');
    console.log(`   OTP found: [${otp1.code}]`);

    const ver1 = await (await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1.email, code: otp1.code })
    })).json();
    console.log('   Result:', ver1.message);
    if (!ver1.success) throw new Error('Verify user 1 failed');
    token1 = ver1.data.token;
    user1Id = ver1.data._id;

    // ===== STEP 3: Register User 2 =====
    console.log('\n📝 Step 3: Registering live_test_user_2...');
    const reg2 = await (await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user2)
    })).json();
    console.log('   Result:', reg2.message);
    if (!reg2.success) throw new Error('Registration user 2 failed');

    // ===== STEP 4: Get OTP & Verify User 2 =====
    console.log('🔑 Step 4: Fetching OTP from DB & verifying user 2...');
    const otp2 = await db.collection('otps').findOne({ email: user2.email, purpose: 'register' });
    if (!otp2) throw new Error('OTP not found for user 2');
    console.log(`   OTP found: [${otp2.code}]`);

    const ver2 = await (await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user2.email, code: otp2.code })
    })).json();
    console.log('   Result:', ver2.message);
    if (!ver2.success) throw new Error('Verify user 2 failed');
    token2 = ver2.data.token;
    user2Id = ver2.data._id;

    // ===== STEP 5: Login User 1 =====
    console.log('\n🔐 Step 5: Logging in as user 1...');
    const login1 = await (await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: user1.username, password: user1.password })
    })).json();
    console.log('   Result:', login1.message);
    if (!login1.success) throw new Error('Login user 1 failed');

    // ===== STEP 6: Login User 2 =====
    console.log('🔐 Step 6: Logging in as user 2...');
    const login2 = await (await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: user2.username, password: user2.password })
    })).json();
    console.log('   Result:', login2.message);
    if (!login2.success) throw new Error('Login user 2 failed');

    // ===== STEP 7: Create a test image and upload a Post =====
    console.log('\n📸 Step 7: Creating test post with file upload for user 1...');
    // Create a small 1x1 red PNG test image
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    const tmpImgPath = path.join(__dirname, 'test_image.png');
    fs.writeFileSync(tmpImgPath, pngBuffer);

    const formData = new FormData();
    formData.append('caption', '🧪 Live E2E Test Post from AWS EC2!');
    formData.append('type', 'photo');
    const fileBlob = new Blob([pngBuffer], { type: 'image/png' });
    formData.append('media', fileBlob, 'test_image.png');

    const postRes = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` },
      body: formData,
    });
    const postData = await postRes.json();
    console.log('   Result:', postData.message || (postData.success ? 'Post created!' : 'Failed'));
    if (!postData.success) throw new Error('Create post failed: ' + postData.message);
    const postId = postData.data._id;
    console.log('   Post ID:', postId);

    // Clean up temp image
    fs.unlinkSync(tmpImgPath);

    // ===== STEP 8: User 2 likes the post =====
    console.log('\n❤️  Step 8: User 2 likes the post...');
    const likeRes = await (await fetch(`${API_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` },
    })).json();
    console.log('   Result:', likeRes.message || (likeRes.success ? 'Post liked!' : 'Failed'));
    if (!likeRes.success) throw new Error('Like post failed');

    // ===== STEP 9: User 2 comments on the post =====
    console.log('💬 Step 9: User 2 comments on the post...');
    const commentRes = await (await fetch(`${API_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId, text: 'Nice post! Testing from AWS 🚀' })
    })).json();
    console.log('   Result:', commentRes.message || (commentRes.success ? 'Comment posted!' : 'Failed'));
    if (!commentRes.success) throw new Error('Comment failed');

    // ===== STEP 10: Start Chat Conversation =====
    console.log('\n💬 Step 10: User 1 starts a chat with user 2...');
    const chatRes = await (await fetch(`${API_URL}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otherUserId: user2Id })
    })).json();
    console.log('   Result:', chatRes.success ? 'Conversation created!' : chatRes.message);
    if (!chatRes.success) throw new Error('Start conversation failed');
    const channelId = chatRes.data.channelId;
    console.log('   Channel ID:', channelId);

    // ===== STEP 11: Send Chat Message =====
    console.log('✉️  Step 11: User 1 sends a message...');
    const msgRes = await (await fetch(`${API_URL}/chat/conversations`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelId, lastMessageText: 'Hello from AWS EC2! 🎉' })
    })).json();
    console.log('   Result:', msgRes.success ? 'Message recorded!' : msgRes.message);
    if (!msgRes.success) throw new Error('Send message failed');

    // ===== STEP 12: User 2 fetches conversations =====
    console.log('📋 Step 12: User 2 fetches conversation list...');
    const convRes = await (await fetch(`${API_URL}/chat/conversations`, {
      headers: { 'Authorization': `Bearer ${token2}` },
    })).json();
    console.log('   Result:', convRes.success ? `Found ${convRes.data.length} conversation(s)` : convRes.message);
    if (!convRes.success) throw new Error('Fetch conversations failed');

    // ===== STEP 13: Fetch Feed =====
    console.log('\n📰 Step 13: Fetching public feed...');
    const feedRes = await (await fetch(`${API_URL}/posts/feed`, {
      headers: { 'Authorization': `Bearer ${token2}` },
    })).json();
    console.log('   Result:', feedRes.success ? `Feed loaded with ${feedRes.data.length} post(s)` : feedRes.message);
    if (!feedRes.success) throw new Error('Fetch feed failed');

    console.log('\n=========================================');
    console.log('🎉🎉🎉 ALL 13 INTEGRATION TESTS PASSED! 🎉🎉🎉');
    console.log('=========================================');
    console.log('\nSummary:');
    console.log('  ✅ User Registration (x2)');
    console.log('  ✅ OTP Verification (x2)');
    console.log('  ✅ User Login (x2)');
    console.log('  ✅ Post Creation (with file upload)');
    console.log('  ✅ Post Like');
    console.log('  ✅ Post Comment');
    console.log('  ✅ Chat Conversation Start');
    console.log('  ✅ Chat Message Send');
    console.log('  ✅ Conversation List Fetch');
    console.log('  ✅ Feed Fetch');

  } catch (error) {
    console.error('\n❌ E2E Test Failed:', error.message);
  } finally {
    console.log('\n🧹 Cleaning up test data...');
    await db.collection('users').deleteMany({ email: /live_test_user/ });
    await db.collection('otps').deleteMany({ email: /live_test_user/ });
    await db.collection('posts').deleteMany({ caption: /Live E2E Test Post/ });
    await db.collection('comments').deleteMany({ text: /Testing from AWS/ });
    // Don't clean conversations with generic pattern to avoid removing real data
    
    await mongoose.disconnect();
    console.log('✅ Cleanup done. MongoDB disconnected.');
  }
}

runTest();
