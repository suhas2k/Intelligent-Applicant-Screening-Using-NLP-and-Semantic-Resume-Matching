/**
 * OTP Service
 * Manages generation, rate limiting, and verification of One-Time Passwords (OTP).
 */

// In-memory cache for active OTPs: identifier -> { code, expiresAt, attempts, createdAt }
const otpCache = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes validity
const RESEND_COOLDOWN_MS = 20 * 1000; // 20 seconds resend cooldown
const MAX_ATTEMPTS = 5;

/**
 * Generate a 6-digit numeric OTP code
 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalize email or phone identifier
 */
function normalizeIdentifier(rawIdentifier) {
  if (!rawIdentifier) return '';
  return rawIdentifier.toString().toLowerCase().trim();
}

const { sendOTPEmail } = require('./email.service');

/**
 * Request / Send an OTP for a given email or phone
 * @param {string} rawIdentifier - Email address or phone number
 * @returns {Promise<Object>} { success, identifier, code, expiresInSeconds, emailResult }
 */
async function requestOTP(rawIdentifier) {
  const id = normalizeIdentifier(rawIdentifier);
  if (!id) {
    const err = new Error('Valid email address or phone number is required.');
    err.status = 400;
    throw err;
  }

  const existing = otpCache.get(id);
  const now = Date.now();

  // Check rate limit cooldown
  if (existing && (now - existing.createdAt < RESEND_COOLDOWN_MS)) {
    const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.createdAt)) / 1000);
    const err = new Error(`Please wait ${remainingSeconds}s before requesting a new OTP.`);
    err.status = 429;
    throw err;
  }

  const code = generateCode();
  const expiresAt = now + OTP_TTL_MS;

  otpCache.set(id, {
    code,
    expiresAt,
    createdAt: now,
    attempts: 0
  });

  console.log(`\n============================================================`);
  console.log(`🔐 [OTP Auth] Verification code for "${id}": ${code}`);
  console.log(`⏰ Valid for 5 minutes (Expires at: ${new Date(expiresAt).toLocaleTimeString()})`);
  console.log(`============================================================\n`);

  let emailResult = null;
  // If the identifier is an email address, dispatch genuine email
  if (id.includes('@')) {
    try {
      emailResult = await sendOTPEmail(id, code, Math.floor(OTP_TTL_MS / (60 * 1000)));
    } catch (mailErr) {
      console.warn(`[OTP Mail Error for ${id}]:`, mailErr.message);
      emailResult = { success: false, error: mailErr.message };
    }
  }

  return {
    success: true,
    identifier: id,
    code,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    emailResult
  };
}

/**
 * Verify a submitted OTP
 * @param {string} rawIdentifier - Email or phone
 * @param {string} rawCode - 6-digit entered OTP
 * @returns {Object} { valid: boolean, message: string }
 */
function verifyOTP(rawIdentifier, rawCode) {
  const id = normalizeIdentifier(rawIdentifier);
  const enteredCode = (rawCode || '').toString().trim();

  if (!id || !enteredCode) {
    return {
      valid: false,
      message: 'Both email/phone and 6-digit OTP code are required.'
    };
  }

  const record = otpCache.get(id);
  const now = Date.now();

  if (!record) {
    return {
      valid: false,
      message: 'No active OTP verification code found. Please request a new code.'
    };
  }

  if (now > record.expiresAt) {
    otpCache.delete(id);
    return {
      valid: false,
      message: 'The OTP code has expired. Please request a new one.'
    };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpCache.delete(id);
    return {
      valid: false,
      message: 'Maximum OTP verification attempts exceeded. Please request a fresh code.'
    };
  }

  if (record.code !== enteredCode) {
    record.attempts++;
    const attemptsLeft = MAX_ATTEMPTS - record.attempts;
    return {
      valid: false,
      message: `Incorrect OTP code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`
    };
  }

  // Verification successful! Invalidate OTP so it cannot be re-used
  otpCache.delete(id);
  return {
    valid: true,
    message: 'OTP verified successfully.'
  };
}

// Background cleanup of expired OTPs every 5 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpCache.entries()) {
    if (now > value.expiresAt) {
      otpCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

function getOTPForTesting(rawIdentifier) {
  const id = normalizeIdentifier(rawIdentifier);
  const rec = otpCache.get(id);
  return rec ? rec.code : null;
}

module.exports = {
  requestOTP,
  verifyOTP,
  getOTPForTesting,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS
};
