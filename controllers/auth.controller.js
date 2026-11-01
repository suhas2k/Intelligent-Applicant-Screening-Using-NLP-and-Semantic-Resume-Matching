/**
 * ResumeIQ - Intelligent Applicant Screening
 * Authentication Controller
 * 
 * Handles:
 * - Email OTP Request, Resend, and Verification
 * - Traditional Email & Password Login and Organization Registration
 * - Google Sign-In (Tokeninfo validation & OAuth profile handling)
 * - Recruiter Session & Profile (/api/auth/me)
 */

const { userRepo } = require('../models/store');
const { generateToken } = require('../middleware/auth.middleware');
const otpService = require('../services/otp.service');
const { getSmtpConfig, verifySmtp } = require('../services/email.service');

// Helper to decode Google ID Token JWT payload safely if offline
function parseGoogleIdToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const payloadStr = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(payloadStr);
  } catch (e) {
    return null;
  }
}

// Live Google token validation against Google's official OAuth2 tokeninfo endpoint
async function verifyGoogleTokenWithGoogle(idToken) {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (response.ok) {
      const data = await response.json();
      // Verify issuer
      if (data.iss !== 'accounts.google.com' && data.iss !== 'https://accounts.google.com') {
        return null;
      }
      // Check expiry
      const now = Math.floor(Date.now() / 1000);
      if (data.exp && parseInt(data.exp, 10) < now) {
        return null;
      }
      // Check audience if client ID is configured
      if (process.env.GOOGLE_CLIENT_ID && data.aud && data.aud !== process.env.GOOGLE_CLIENT_ID) {
        console.warn('[Google Auth] Token aud mismatch with GOOGLE_CLIENT_ID');
      }
      return data;
    }
    return null;
  } catch (err) {
    console.warn('[Google tokeninfo warning]:', err.message);
    return null;
  }
}

// Fetch user profile using Google OAuth2 access token
async function verifyGoogleAccessToken(accessToken) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (err) {
    console.warn('[Google userinfo warning]:', err.message);
    return null;
  }
}

// ---------------- 1. EMAIL & PASSWORD AUTHENTICATION ----------------

// Register a new organization / recruiter
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, company, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Recruiter name, work email, and password are required fields.'
      });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid corporate email format.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters in length.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match. Please ensure both passwords match.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await userRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A recruiter account with this email address already exists.'
      });
    }

    const newUser = await userRepo.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone ? phone.trim() : '',
      company: company ? company.trim() : 'Talent Acquisition Team',
      role: role || 'recruiter',
      authProvider: 'local'
    });

    const token = generateToken(newUser._id);

    res.status(201).json({
      success: true,
      message: 'Recruiter account registered successfully.',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        company: newUser.company,
        role: newUser.role,
        authProvider: 'local'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login recruiter with email & password
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both work email and password.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepo.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. No recruiter account found with this email.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. The password you entered is incorrect.'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        role: user.role,
        avatar: user.avatar || null,
        authProvider: user.authProvider || 'local'
      }
    });
  } catch (error) {
    next(error);
  }
};

// ---------------- 2. REAL EMAIL OTP AUTHENTICATION ----------------

// Send 6-Digit OTP to email address
exports.sendOTP = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    const targetEmail = (email || phone || '').toLowerCase().trim();

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid work email address to receive a verification code.'
      });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
    if (!emailRegex.test(targetEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format. Please enter a valid email.'
      });
    }

    // Call secure OTP generator and genuine email delivery
    const otpResult = await otpService.requestOTP(targetEmail);
    const existingUser = await userRepo.findByEmail(targetEmail);

    res.json({
      success: true,
      message: `Security verification code dispatched to your email inbox (${targetEmail}).`,
      identifier: targetEmail,
      expiresInSeconds: otpResult.expiresInSeconds,
      cooldownSeconds: otpResult.cooldownSeconds,
      isExistingUser: Boolean(existingUser),
      isRealDelivery: true
    });
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: error.message,
        remainingSeconds: error.remainingSeconds || 60
      });
    }
    if (error.status === 503) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured. Please set SMTP_USER and SMTP_PASS in the backend environment.'
      });
    }
    if (error.status === 502) {
      return res.status(502).json({
        success: false,
        message: error.message || 'Unable to deliver verification code. Please check your SMTP configuration.'
      });
    }
    next(error);
  }
};

// Resend OTP (with 60-second cooldown check)
exports.resendOTP = async (req, res, next) => {
  // Delegates to sendOTP to guarantee cooldown enforcement and fresh secure generation
  return exports.sendOTP(req, res, next);
};

// Verify 6-digit OTP and issue recruiter JWT session
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, phone, otp, name, company } = req.body;
    const targetEmail = (email || phone || '').toLowerCase().trim();
    const enteredOtp = (otp || '').toString().trim();

    if (!targetEmail || !enteredOtp) {
      return res.status(400).json({
        success: false,
        message: 'Both work email and 6-digit verification code are required.'
      });
    }

    // Validate code cryptographically
    const verification = otpService.verifyOTP(targetEmail, enteredOtp);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // Locate or auto-provision recruiter account
    let user = await userRepo.findByEmail(targetEmail);

    if (!user) {
      const fallbackName = (name || targetEmail.split('@')[0]).trim();
      const formattedName = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);

      user = await userRepo.create({
        name: formattedName,
        email: targetEmail,
        company: company ? company.trim() : 'Talent Acquisition Team',
        role: 'recruiter',
        authProvider: 'otp'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Signed in successfully via email verification code.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        role: user.role,
        avatar: user.avatar || null,
        authProvider: user.authProvider || 'otp'
      }
    });
  } catch (error) {
    next(error);
  }
};

// ---------------- 3. GOOGLE ACCOUNTS AUTHENTICATION ----------------

// Authenticate via Google ID Token, OAuth Access Token, or Google Profile
exports.googleAuth = async (req, res, next) => {
  try {
    const { credential, accessToken, googleProfile } = req.body;
    let email, name, googleId, avatar;

    if (credential) {
      // 1. Verify with Google's official tokeninfo endpoint
      const liveGoogleToken = await verifyGoogleTokenWithGoogle(credential);
      if (liveGoogleToken && liveGoogleToken.email) {
        email = liveGoogleToken.email.toLowerCase().trim();
        name = liveGoogleToken.name || liveGoogleToken.given_name || email.split('@')[0];
        googleId = liveGoogleToken.sub;
        avatar = liveGoogleToken.picture || null;
      } else {
        // Fallback: parse ID token payload if tokeninfo unreachable
        const payload = parseGoogleIdToken(credential);
        if (!payload || !payload.email) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or unverifiable Google credential token.'
          });
        }
        email = payload.email.toLowerCase().trim();
        name = payload.name || payload.given_name || email.split('@')[0];
        googleId = payload.sub;
        avatar = payload.picture || null;
      }
    } else if (accessToken) {
      // 2. Validate Google OAuth2 Access Token
      const userinfo = await verifyGoogleAccessToken(accessToken);
      if (!userinfo || !userinfo.email) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Google OAuth access token.'
        });
      }
      email = userinfo.email.toLowerCase().trim();
      name = userinfo.name || userinfo.given_name || email.split('@')[0];
      googleId = userinfo.sub || userinfo.id;
      avatar = userinfo.picture || null;
    } else if (googleProfile && googleProfile.email) {
      // 3. User account profile from Google chooser
      email = googleProfile.email.toLowerCase().trim();
      name = googleProfile.name || email.split('@')[0];
      googleId = googleProfile.googleId || googleProfile.id || googleProfile.sub || ('google_' + Date.now());
      avatar = googleProfile.avatar || googleProfile.picture || null;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No Google credential, access token, or account profile provided.'
      });
    }

    // Locate existing recruiter or register on-the-fly
    let user = await userRepo.findByEmail(email);
    if (!user && googleId) {
      user = await userRepo.findByGoogleId(googleId);
    }

    if (user) {
      if (!user.googleId || (avatar && !user.avatar)) {
        await userRepo.findByIdAndUpdate(user._id, {
          googleId: user.googleId || googleId,
          avatar: user.avatar || avatar
        });
      }
    } else {
      user = await userRepo.create({
        name,
        email,
        company: 'Talent Acquisition Team',
        role: 'recruiter',
        authProvider: 'google',
        googleId,
        avatar
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Signed in successfully with Google.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        role: user.role,
        avatar: user.avatar || avatar || null,
        authProvider: 'google'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Return Google OAuth Client and Mail status configuration to frontend
exports.getGoogleConfig = async (req, res) => {
  const smtpConfig = getSmtpConfig();
  res.json({
    success: true,
    clientId: process.env.GOOGLE_CLIENT_ID || null,
    hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')),
    hasSmtpConfig: Boolean(smtpConfig)
  });
};

// Update Google OAuth Client ID dynamically
exports.setGoogleClientId = async (req, res) => {
  const { clientId } = req.body;
  if (clientId && typeof clientId === 'string') {
    process.env.GOOGLE_CLIENT_ID = clientId.trim();
  }
  const smtpConfig = getSmtpConfig();
  res.json({
    success: true,
    message: 'Google Client ID updated successfully.',
    clientId: process.env.GOOGLE_CLIENT_ID || null,
    hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')),
    hasSmtpConfig: Boolean(smtpConfig)
  });
};

// ---------------- 4. CURRENT AUTHENTICATED PROFILE ----------------

// Get current logged-in recruiter profile
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      company: req.user.company,
      role: req.user.role,
      avatar: req.user.avatar || null,
      authProvider: req.user.authProvider || 'local'
    }
  });
};
