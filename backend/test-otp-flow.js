import mongoose from 'mongoose';

const API_URL = 'http://127.0.0.1:5000/api';
const DB_URI = 'mongodb://127.0.0.1:27017/wisp';

const runTest = async () => {
  console.log('🧪 Starting Automated OTP Flow Integration Test (using Native Fetch)...\n');
  
  // 1. Connect to MongoDB to query the OTP collections programmatically
  await mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('✅ Connected to MongoDB to retrieve codes.');

  // Clean up any old test users
  const db = mongoose.connection.db;
  await db.collection('users').deleteMany({ email: 'otp_test_agent@oravia.com' });
  await db.collection('otps').deleteMany({ email: 'otp_test_agent@oravia.com' });

  const testUser = {
    username: 'otp_test_agent',
    email: 'otp_test_agent@oravia.com',
    password: 'password1234',
    displayName: 'OTP Agent',
    bio: 'Testing Oravia OTP integrations',
  };

  try {
    // 2. Register unverified user
    console.log('\nStep 1: Registering unverified test user...');
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    
    const registerData = await registerRes.json();
    console.log('Result:', registerData.message);
    if (!registerData.success) {
      throw new Error('Registration failed: ' + registerData.message);
    }

    // 3. Query the generated OTP code from the database
    console.log('\nStep 2: Retrieving registration OTP code from MongoDB...');
    let otpDoc = await db.collection('otps').findOne({ 
      email: testUser.email, 
      purpose: 'register' 
    });

    if (!otpDoc) {
      throw new Error('OTP document not found in database! Email dispatch may have failed.');
    }
    console.log(`Found OTP Code in DB: [${otpDoc.code}]`);

    // 4. Verify OTP via API
    console.log('\nStep 3: Submitting OTP verification request...');
    const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        code: otpDoc.code,
      }),
    });

    const verifyData = await verifyRes.json();
    console.log('Result:', verifyData.message);
    if (!verifyData.success || !verifyData.data.token) {
      throw new Error('OTP verification failed: ' + verifyData.message);
    }
    console.log('✅ Registration OTP Verified. Account Activated!');

    // 5. Try logging in to verify token issuance
    console.log('\nStep 4: Logging in with activated credentials...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: testUser.email,
        password: testUser.password,
      }),
    });

    const loginData = await loginRes.json();
    console.log('Result:', loginData.message);
    if (!loginData.success) {
      throw new Error('Login failed: ' + loginData.message);
    }
    console.log('✅ Login successful, token issued.');

    // 6. Trigger Forgot Password
    console.log('\nStep 5: Requesting forgot password OTP reset...');
    const forgotRes = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
      }),
    });

    const forgotData = await forgotRes.json();
    console.log('Result:', forgotData.message);
    if (!forgotData.success) {
      throw new Error('Forgot password request failed: ' + forgotData.message);
    }

    // 7. Query forgot password OTP code from database
    console.log('\nStep 6: Retrieving forgot password OTP code from MongoDB...');
    let resetOtpDoc = await db.collection('otps').findOne({ 
      email: testUser.email, 
      purpose: 'forgot_password' 
    });

    if (!resetOtpDoc) {
      throw new Error('Forgot password OTP code not found in database!');
    }
    console.log(`Found Reset OTP Code in DB: [${resetOtpDoc.code}]`);

    // 8. Submit password reset request
    console.log('\nStep 7: Resetting password using OTP code...');
    const newPassword = 'newSecretPassword77';
    const resetRes = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        code: resetOtpDoc.code,
        newPassword,
      }),
    });

    const resetData = await resetRes.json();
    console.log('Result:', resetData.message);
    if (!resetData.success) {
      throw new Error('Password reset failed: ' + resetData.message);
    }
    console.log('✅ Password successfully reset!');

    // 9. Login with new password to confirm
    console.log('\nStep 8: Logging in with the new password...');
    const finalLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: testUser.email,
        password: newPassword,
      }),
    });

    const finalLoginData = await finalLoginRes.json();
    console.log('Result:', finalLoginData.message);
    if (!finalLoginData.success || !finalLoginData.data.token) {
      throw new Error('Login with new password failed: ' + finalLoginData.message);
    }
    console.log('✅ Successfully authenticated with the new password!');

    console.log('\n🎉 ALL OTP INTEGRATION CHECKS PASSED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
  } finally {
    // Clean up test data and close connection
    await db.collection('users').deleteMany({ email: 'otp_test_agent@oravia.com' });
    await db.collection('otps').deleteMany({ email: 'otp_test_agent@oravia.com' });
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB. Exiting test.');
  }
};

runTest();
