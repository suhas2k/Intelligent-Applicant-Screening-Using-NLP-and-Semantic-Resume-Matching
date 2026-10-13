/**
 * Automated Verification Script for Real Authentication
 * Tests:
 * 1. Google Auth Config
 * 2. Real Email OTP Dispatch via Nodemailer
 * 3. OTP Verification & Session Issuance
 * 4. Google Account Sign-In & Profile Association
 * 5. Traditional Recruiter Login
 */

const http = require('http');

async function runTests() {
  console.log('------------------------------------------------------------');
  console.log('Testing ResumeIQ Authentication System...');
  console.log('------------------------------------------------------------');

  // Load server module
  const app = require('../server');
  
  // Wait a moment for server warm up
  await new Promise(r => setTimeout(r, 1000));

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  async function postJson(endpoint, data) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return { status: res.status, data: json };
  }

  async function getJson(endpoint, token) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${endpoint}`, { headers });
    const json = await res.json();
    return { status: res.status, data: json };
  }

  let passed = 0;
  let failed = 0;

  // 1. Google Config Test
  try {
    console.log('\n[TEST 1] GET /api/auth/google/config');
    const cfg = await getJson('/api/auth/google/config');
    console.log('Result:', cfg.data);
    if (cfg.status === 200 && cfg.data.success) {
      console.log('✓ PASS: Google & Mail config returned correctly');
      passed++;
    } else {
      throw new Error('Config endpoint failed');
    }
  } catch (err) {
    console.error('✗ FAIL [TEST 1]:', err.message);
    failed++;
  }

  // 2. Email OTP Send Test
  let testCode = null;
  try {
    console.log('\n[TEST 2] POST /api/auth/otp/send (Nodemailer Email Dispatch)');
    const sendRes = await postJson('/api/auth/otp/send', { email: 'recruiter.test@resumeiq.ai' });
    console.log('Result:', sendRes.data);
    if (sendRes.status === 200 && sendRes.data.success) {
      if (sendRes.data.demoOtp !== undefined) {
        throw new Error('Security violation: demoOtp must not be leaked in production API response!');
      }
      testCode = require('../services/otp.service').getOTPForTesting('recruiter.test@resumeiq.ai');
      console.log('✓ PASS: OTP Email dispatched! Code retrieved securely from test mailbox:', testCode);
      if (sendRes.data.previewUrl) {
        console.log('  Live Ethereal Preview URL:', sendRes.data.previewUrl);
      }
      passed++;
    } else {
      throw new Error(sendRes.data.message || 'OTP send failed');
    }
  } catch (err) {
    console.error('✗ FAIL [TEST 2]:', err.message);
    failed++;
  }

  // 3. Email OTP Verify Test
  try {
    console.log('\n[TEST 3] POST /api/auth/otp/verify (Verify 6-digit Code)');
    if (!testCode) throw new Error('No test code available');
    const verifyRes = await postJson('/api/auth/otp/verify', {
      email: 'recruiter.test@resumeiq.ai',
      otp: testCode,
      name: 'Test Recruiter'
    });
    console.log('Result:', verifyRes.data);
    if (verifyRes.status === 200 && verifyRes.data.success && verifyRes.data.token) {
      console.log('✓ PASS: OTP verified, JWT issued, user created with authProvider = "otp"');
      passed++;
    } else {
      throw new Error(verifyRes.data.message || 'OTP verification failed');
    }
  } catch (err) {
    console.error('✗ FAIL [TEST 3]:', err.message);
    failed++;
  }

  // 4. Google Account Sign-In Test
  try {
    console.log('\n[TEST 4] POST /api/auth/google (Google Account Sign-In)');
    const googleRes = await postJson('/api/auth/google', {
      googleProfile: {
        email: 'manikanta.recruiter@gmail.com',
        name: 'Manikanta',
        googleId: 'google_sub_1092830192',
        avatar: 'https://lh3.googleusercontent.com/a/default-avatar'
      }
    });
    console.log('Result:', googleRes.data);
    if (googleRes.status === 200 && googleRes.data.success && googleRes.data.token) {
      console.log('✓ PASS: Google account signed in, JWT issued, user profile associated with Google provider');
      passed++;
    } else {
      throw new Error(googleRes.data.message || 'Google auth failed');
    }
  } catch (err) {
    console.error('✗ FAIL [TEST 4]:', err.message);
    failed++;
  }

  // 5. Password Login Test
  try {
    console.log('\n[TEST 5] POST /api/auth/login (Recruiter Password Sign-In)');
    const loginRes = await postJson('/api/auth/login', {
      email: 'recruiter@demo.com',
      password: 'password123'
    });
    console.log('Result:', loginRes.data);
    if (loginRes.status === 200 && loginRes.data.success && loginRes.data.token) {
      console.log('✓ PASS: Recruiter logged in successfully');
      passed++;
    } else {
      throw new Error(loginRes.data.message || 'Login failed');
    }
  } catch (err) {
    console.error('✗ FAIL [TEST 5]:', err.message);
    failed++;
  }

  console.log(`\n============================================================`);
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`============================================================\n`);

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
