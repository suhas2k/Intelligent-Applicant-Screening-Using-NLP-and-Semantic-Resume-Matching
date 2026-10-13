/**
 * Authentication Test Suite
 * Tests Password, OTP, and Google authentication flows.
 */

const { userRepo } = require('../models/store');
const otpService = require('../services/otp.service');
const { generateToken, authenticate } = require('../middleware/auth.middleware');
const authController = require('../controllers/auth.controller');

async function runTests() {
  console.log('============================================================');
  console.log('🧪 RUNNING AUTHENTICATION VERIFICATION TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS]: ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL]: ${testName}`);
      failed++;
    }
  }

  // Mock res & req helpers
  function createMockRes() {
    return {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
  }

  // 1. Test Seed User
  console.log('--- 1. Testing Default Recruiter Account ---');
  let demoUser = await userRepo.findByEmail('recruiter@demo.com');
  if (!demoUser) {
    demoUser = await userRepo.create({
      name: 'Manikanta',
      email: 'recruiter@demo.com',
      password: 'password123',
      company: 'TalentForge Technologies',
      role: 'recruiter'
    });
  }
  assert(demoUser !== null, 'Demo recruiter exists or created');
  assert(demoUser.email === 'recruiter@demo.com', 'Demo recruiter email is correct');

  // 2. Test Password Login
  console.log('\n--- 2. Testing Traditional Password Login ---');
  const loginReq = { body: { email: 'recruiter@demo.com', password: 'password123' } };
  const loginRes = createMockRes();
  await authController.login(loginReq, loginRes, (err) => { throw err; });
  assert(loginRes.statusCode === 200 && loginRes.jsonData.success === true, 'Password login succeeds with correct credentials');
  assert(Boolean(loginRes.jsonData.token), 'Valid JWT token issued on login');

  const invalidLoginReq = { body: { email: 'recruiter@demo.com', password: 'wrongpassword' } };
  const invalidLoginRes = createMockRes();
  await authController.login(invalidLoginReq, invalidLoginRes, (err) => { throw err; });
  assert(invalidLoginRes.statusCode === 401 && invalidLoginRes.jsonData.success === false, 'Password login correctly rejected for invalid password');

  // 3. Test OTP Send Flow
  console.log('\n--- 3. Testing OTP Send Flow ---');
  const otpSendReq = { body: { email: 'recruiter@demo.com' } };
  const otpSendRes = createMockRes();
  await authController.sendOTP(otpSendReq, otpSendRes, (err) => { throw err; });
  assert(otpSendRes.statusCode === 200 && otpSendRes.jsonData.success === true, 'OTP send request succeeds');
  assert(otpSendRes.jsonData.isExistingUser === true, 'Correctly flags existing recruiter user');
  assert(otpSendRes.jsonData.demoOtp === undefined, 'Security check: demoOtp is not leaked in response');

  const generatedCode = otpService.getOTPForTesting('recruiter@demo.com');
  assert(generatedCode && generatedCode.length === 6, 'Generated 6-digit OTP code in store');

  // 4. Test OTP Verify Flow (Existing User)
  console.log('\n--- 4. Testing OTP Verify Flow (Existing User) ---');
  // First try incorrect OTP
  const badVerifyReq = { body: { email: 'recruiter@demo.com', otp: '000000' } };
  const badVerifyRes = createMockRes();
  await authController.verifyOTP(badVerifyReq, badVerifyRes, (err) => { throw err; });
  assert(badVerifyRes.statusCode === 400 && badVerifyRes.jsonData.success === false, 'Invalid OTP code correctly rejected');

  // Now verify with correct OTP
  const goodVerifyReq = { body: { email: 'recruiter@demo.com', otp: generatedCode } };
  const goodVerifyRes = createMockRes();
  await authController.verifyOTP(goodVerifyReq, goodVerifyRes, (err) => { throw err; });
  assert(goodVerifyRes.statusCode === 200 && goodVerifyRes.jsonData.success === true, 'Valid OTP verifies successfully');
  assert(Boolean(goodVerifyRes.jsonData.token), 'JWT token returned on OTP login');
  assert(goodVerifyRes.jsonData.user.email === 'recruiter@demo.com', 'Authenticated user matches recipient email');

  // Try to reuse same OTP (should fail single-use check)
  const reuseVerifyRes = createMockRes();
  await authController.verifyOTP(goodVerifyReq, reuseVerifyRes, (err) => { throw err; });
  assert(reuseVerifyRes.statusCode === 400, 'Re-using consumed OTP is rejected');

  // 5. Test OTP Flow (New User Auto-Creation)
  console.log('\n--- 5. Testing OTP Sign-In for New User ---');
  const newEmail = 'new.recruiter.' + Date.now() + '@innovatech.io';
  const newOtpSendRes = createMockRes();
  await authController.sendOTP({ body: { email: newEmail } }, newOtpSendRes, (err) => { throw err; });
  assert(newOtpSendRes.jsonData.isExistingUser === false, 'Identifies new recruiter registration via OTP');

  const newVerifyRes = createMockRes();
  await authController.verifyOTP({
    body: {
      email: newEmail,
      otp: otpService.getOTPForTesting(newEmail),
      name: 'Elena Rostova',
      company: 'InnovaTech Global'
    }
  }, newVerifyRes, (err) => { throw err; });
  assert(newVerifyRes.statusCode === 200, 'New user successfully registered and signed in via OTP');
  assert(newVerifyRes.jsonData.user.name === 'Elena Rostova', 'New user name correctly saved');
  assert(newVerifyRes.jsonData.user.authProvider === 'otp', 'New user authProvider is "otp"');

  // 6. Test Google Authentication Flow
  console.log('\n--- 6. Testing Google Authentication Flow ---');
  const googleProfileReq = {
    body: {
      googleProfile: {
        email: 'manikanta.recruiter@gmail.com',
        name: 'Manikanta',
        googleId: '1098234710293847',
        avatar: 'https://lh3.googleusercontent.com/a/default-user'
      }
    }
  };
  const googleRes = createMockRes();
  await authController.googleAuth(googleProfileReq, googleRes, (err) => { throw err; });
  assert(googleRes.statusCode === 200 && googleRes.jsonData.success === true, 'Google authentication succeeds');
  assert(googleRes.jsonData.user.email === 'manikanta.recruiter@gmail.com', 'Google recruiter email correctly mapped');
  assert(googleRes.jsonData.user.authProvider === 'google', 'User authProvider is "google"');
  assert(Boolean(googleRes.jsonData.token), 'JWT token returned on Google sign in');

  // Repeat Google Auth for existing user (updates metadata without duplicating)
  const googleRepeatRes = createMockRes();
  await authController.googleAuth(googleProfileReq, googleRepeatRes, (err) => { throw err; });
  assert(googleRepeatRes.statusCode === 200, 'Existing Google user successfully authenticated without duplication');
  assert(googleRepeatRes.jsonData.user.id.toString() === googleRes.jsonData.user.id.toString(), 'Reused existing user ID');

  // 7. Test JWT Middleware Protection
  console.log('\n--- 7. Testing Protected Route Middleware with JWT ---');
  let authMiddlewareSuccess = false;
  const mockReq = { headers: { authorization: `Bearer ${googleRes.jsonData.token}` } };
  const mockAuthRes = createMockRes();
  await authenticate(mockReq, mockAuthRes, () => {
    authMiddlewareSuccess = true;
  });
  assert(authMiddlewareSuccess, 'authenticate middleware validates JWT and populates req.user');
  assert(mockReq.user.email === 'manikanta.recruiter@gmail.com', 'req.user populated with recruiter profile');

  console.log('\n============================================================');
  console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
