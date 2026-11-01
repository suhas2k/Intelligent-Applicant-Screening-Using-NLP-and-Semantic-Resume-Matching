/**
 * ResumeIQ - Intelligent Applicant Screening
 * OTP Security Service
 * 
 * Features:
 * - Cryptographically secure 6-digit numeric OTP generation (crypto.randomInt)
 * - SHA-256 salted OTP hashing before memory storage
 * - Timing-safe verification against brute-force attacks
 * - Configurable 5-minute validity window
 * - Strict 60-second resend cooldown
 * - Maximum 5 verification attempts before invalidation
 * - Single-use token invalidation
 * - Invalidation of previous OTP when a replacement is generated
 * - No sensitive OTP codes exposed in production logs
 */

const crypto = require('crypto');
const { sendOTPEmail } = require('./email.service');

// Active OTP records: normalizedEmail -> { hashedOtp, expiresAt, createdAt, attempts, maxAttempts }
const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;       // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;   // 60 seconds
const MAX_ATTEMPTS = 5;
const OTP_SALT = process.env.JWT_SECRET || 'ResumeIQ_Security_Salt_2026_NLP';

/**
 * Normalize email identifier
 * @param {string} raw
 * @returns {string}
 */
function normalizeIdentifier(raw) {
  if (!raw) return '';
  return raw.toString().toLowerCase().trim();
}

/**
 * Cryptographically secure 6-digit OTP generation
 * Never uses Math.random()
 * @returns {string} 6-digit numeric string
 */
function generateSecureCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash an OTP code before storage
 * @param {string} code
 * @param {string} identifier
 * @returns {string}
 */
function hashOtp(code, identifier) {
  return crypto.createHash('sha256')
    .update(`${code}:${identifier}:${OTP_SALT}`)
    .digest('hex');
}

/**
 * Request / Send an OTP verification code
 * @param {string} rawIdentifier - Email address
 * @returns {Promise<Object>}
 */
async function requestOTP(rawIdentifier) {
  const id = normalizeIdentifier(rawIdentifier);
  if (!id || !id.includes('@')) {
    const err = new Error('A valid email address is required to receive a verification code.');
    err.status = 400;
    throw err;
  }

  const now = Date.now();
  const existing = otpStore.get(id);

  // Enforce 60-second resend cooldown
  if (existing && (now - existing.createdAt < RESEND_COOLDOWN_MS)) {
    const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.createdAt)) / 1000);
    const err = new Error(`Please wait ${remainingSeconds}s before requesting another verification code.`);
    err.status = 429;
    err.remainingSeconds = remainingSeconds;
    throw err;
  }

  // Generate cryptographically secure 6-digit OTP
  const code = generateSecureCode();
  const hashedOtp = hashOtp(code, id);
  const expiresAt = now + OTP_TTL_MS;

  // Invalidate any previous OTP by clearing before dispatch
  otpStore.delete(id);

  // Dispatch real email via Nodemailer
  // If sending fails, we do NOT store the OTP and the error is cleanly thrown
  const emailResult = await sendOTPEmail(id, code, Math.floor(OTP_TTL_MS / (60 * 1000)));

  // Save hashed OTP only after the email has been successfully accepted by the provider
  otpStore.set(id, {
    hashedOtp,
    expiresAt,
    createdAt: now,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS
  });

  console.log(`[OTP Service] Cryptographic 6-digit OTP generated and dispatched to: ${id} (Expires in 5 minutes)`);

  return {
    success: true,
    identifier: id,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    cooldownSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000),
    emailResult
  };
}

/**
 * Verify a submitted 6-digit OTP
 * @param {string} rawIdentifier - Email address
 * @param {string} rawCode - 6-digit OTP
 * @returns {Object} { valid: boolean, message: string }
 */
function verifyOTP(rawIdentifier, rawCode) {
  const id = normalizeIdentifier(rawIdentifier);
  const enteredCode = (rawCode || '').toString().trim();

  if (!id || !enteredCode) {
    return {
      valid: false,
      message: 'Both email address and 6-digit verification code are required.'
    };
  }

  if (enteredCode.length !== 6 || !/^\d{6}$/.test(enteredCode)) {
    return {
      valid: false,
      message: 'Please enter a valid 6-digit numerical verification code.'
    };
  }

  const record = otpStore.get(id);
  const now = Date.now();

  if (!record) {
    return {
      valid: false,
      message: 'No active verification code found for this email. Please request a new code.'
    };
  }

  if (now > record.expiresAt) {
    otpStore.delete(id);
    return {
      valid: false,
      message: 'Verification code expired. Please request a new code.'
    };
  }

  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(id);
    return {
      valid: false,
      message: 'Too many incorrect attempts. For security, this code has been invalidated. Please request a new code.'
    };
  }

  // Calculate entered hash and compare using constant-time comparison
  const candidateHash = hashOtp(enteredCode, id);
  const candidateBuf = Buffer.from(candidateHash, 'hex');
  const storedBuf = Buffer.from(record.hashedOtp, 'hex');

  let isMatch = false;
  if (candidateBuf.length === storedBuf.length) {
    isMatch = crypto.timingSafeEqual(candidateBuf, storedBuf);
  }

  if (!isMatch) {
    record.attempts++;
    const attemptsRemaining = record.maxAttempts - record.attempts;
    if (attemptsRemaining <= 0) {
      otpStore.delete(id);
      return {
        valid: false,
        message: 'Too many incorrect attempts. This verification code has been invalidated. Please request a fresh code.'
      };
    }
    return {
      valid: false,
      message: `Incorrect verification code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`
    };
  }

  // Verification successful! Invalidate single-use code immediately
  otpStore.delete(id);

  return {
    valid: true,
    message: 'Verification code validated successfully.'
  };
}

// Background cleanup of expired OTPs every 3 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 3 * 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

module.exports = {
  requestOTP,
  verifyOTP,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS
};
