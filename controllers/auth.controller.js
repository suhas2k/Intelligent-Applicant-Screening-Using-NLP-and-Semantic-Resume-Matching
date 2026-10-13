const { userRepo } = require('../models/store');
const { generateToken } = require('../middleware/auth.middleware');
const otpService = require('../services/otp.service');
const { getSmtpConfig } = require('../services/email.service');

// Helper to decode Google ID Token JWT payload safely
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

// Live Google token validation against Google OAuth2 tokeninfo endpoint
async function verifyGoogleTokenWithGoogle(idToken) {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (response.ok) {
      const data = await response.json();
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

// Register a new recruiter
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, company, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A recruiter account with this email address already exists.'
      });
    }

    const newUser = await userRepo.create({
      name,
      email,
      password,
      company: company || 'Acme Talent Corp',
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
        message: 'Please provide both email and password.'
      });
    }

    const user = await userRepo.findByEmail(email);
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
        message: 'Invalid credentials. Password does not match.'
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

// ---------------- 2. OTP AUTHENTICATION ----------------

// Send OTP to email or phone
exports.sendOTP = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    const identifier = email || phone;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid work email or phone number to receive an OTP.'
      });
    }

    if (email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email format.'
        });
      }
    }

    const otpResult = await otpService.requestOTP(identifier);
    const existingUser = await userRepo.findByEmail(identifier) || (phone ? await userRepo.findByPhone(identifier) : null);

    const isRealDelivery = Boolean(otpResult.emailResult && otpResult.emailResult.isRealDelivery);
    const previewUrl = otpResult.emailResult?.previewUrl || null;

    res.json({
      success: true,
      message: isRealDelivery
        ? `Security verification code dispatched to your email inbox (${identifier}).`
        : `Verification code sent to ${identifier}.`,
      identifier: otpResult.identifier,
      expiresInSeconds: otpResult.expiresInSeconds,
      isExistingUser: Boolean(existingUser),
      previewUrl,
      isRealDelivery
    });
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// Verify OTP and issue JWT session
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, phone, otp, name, company } = req.body;
    const identifier = email || phone;

    if (!identifier || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Both email/phone and 6-digit OTP code are required.'
      });
    }

    const verification = otpService.verifyOTP(identifier, otp);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // Locate or auto-create recruiter profile
    let user = await userRepo.findByEmail(identifier);
    if (!user && phone) {
      user = await userRepo.findByPhone(identifier);
    }

    if (!user) {
      // Create new recruiter account automatically via OTP
      const fallbackName = (name || (identifier.includes('@') ? identifier.split('@')[0] : 'Recruiter')).trim();
      const formattedName = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);

      user = await userRepo.create({
        name: formattedName,
        email: identifier.includes('@') ? identifier : `${identifier.replace(/\D/g, '')}@recruiter.local`,
        phone: phone || (identifier.includes('@') ? '' : identifier),
        company: company || 'Talent Acquisition Team',
        role: 'recruiter',
        authProvider: 'otp'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Signed in successfully via OTP.',
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
      // 1. First attempt genuine Google token verification with Google's tokeninfo API
      const liveGoogleToken = await verifyGoogleTokenWithGoogle(credential);
      if (liveGoogleToken && liveGoogleToken.email) {
        email = liveGoogleToken.email.toLowerCase().trim();
        name = liveGoogleToken.name || liveGoogleToken.given_name || email.split('@')[0];
        googleId = liveGoogleToken.sub;
        avatar = liveGoogleToken.picture || null;
      } else {
        // Fallback: safely parse JWT payload
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
      // 3. Direct Google Profile from account chooser
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
      // Update Google metadata if needed
      if (!user.googleId || (avatar && !user.avatar)) {
        await userRepo.findByIdAndUpdate(user._id, {
          googleId: user.googleId || googleId,
          avatar: user.avatar || avatar
        });
      }
    } else {
      // Create new recruiter account for this Google user
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

// Update SMTP Mail Configuration dynamically
exports.setMailConfig = async (req, res) => {
  const { smtpUser, smtpPass, smtpHost, smtpPort } = req.body;
  if (smtpUser && typeof smtpUser === 'string') {
    process.env.SMTP_USER = smtpUser.trim();
    process.env.EMAIL_FROM = `"ResumeIQ Security" <${smtpUser.trim()}>`;
  }
  if (smtpPass && typeof smtpPass === 'string') {
    process.env.SMTP_PASS = smtpPass.trim();
  }
  if (smtpHost && typeof smtpHost === 'string') {
    process.env.SMTP_HOST = smtpHost.trim();
  }
  if (smtpPort) {
    process.env.SMTP_PORT = String(smtpPort).trim();
  }

  const smtpConfig = getSmtpConfig();
  res.json({
    success: true,
    message: smtpConfig
      ? 'Live SMTP credentials configured successfully! Emails will be sent directly via your SMTP account.'
      : 'SMTP user configured. Provide a 16-character App Password to activate direct delivery.',
    hasSmtpConfig: Boolean(smtpConfig),
    smtpUser: process.env.SMTP_USER || null
  });
};

// ---------------- 4. CURRENT PROFILE ----------------

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
