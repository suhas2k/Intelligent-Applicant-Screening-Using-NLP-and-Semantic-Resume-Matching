const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Traditional password authentication
router.post('/register', authController.register);
router.post('/login', authController.login);

// OTP authentication
router.post('/otp/send', authController.sendOTP);
router.post('/otp/verify', authController.verifyOTP);

// Google & Mail configuration
router.post('/google', authController.googleAuth);
router.get('/google/config', authController.getGoogleConfig);
router.post('/google/config', authController.setGoogleClientId);
router.post('/mail/config', authController.setMailConfig);

// Authenticated session profile
router.get('/me', authenticate, authController.getMe);

module.exports = router;
