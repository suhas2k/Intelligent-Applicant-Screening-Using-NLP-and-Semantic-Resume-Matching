const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Traditional password authentication
router.post('/register', authController.register);
router.post('/login', authController.login);

// Email OTP authentication endpoints (supporting both /send-otp and /otp/send naming)
router.post('/send-otp', authController.sendOTP);
router.post('/otp/send', authController.sendOTP);

router.post('/verify-otp', authController.verifyOTP);
router.post('/otp/verify', authController.verifyOTP);

router.post('/resend-otp', authController.resendOTP);
router.post('/otp/resend', authController.resendOTP);

// Google OAuth authentication
router.post('/google', authController.googleAuth);
router.get('/google/config', authController.getGoogleConfig);
router.post('/google/config', authController.setGoogleClientId);

// Authenticated recruiter session profile
router.get('/me', authenticate, authController.getMe);

module.exports = router;
