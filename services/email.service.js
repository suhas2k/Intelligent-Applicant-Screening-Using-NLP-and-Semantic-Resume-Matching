/**
 * ResumeIQ - Intelligent Applicant Screening
 * Email Service (Nodemailer Infrastructure)
 * 
 * Supports:
 * - SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_FROM_NAME
 * - Google App Passwords for Gmail SMTP
 * - Custom enterprise SMTP hosts (Amazon SES, SendGrid, Mailgun, Postmark, Outlook)
 * - Connection pooling and socket timeout safety
 * - Honest delivery reporting (no fake simulation)
 */

const nodemailer = require('nodemailer');

let transporterInstance = null;
let currentConfigSignature = '';

/**
 * Parse and validate SMTP environment configuration
 * @returns {Object|null} Validated SMTP configuration or null if not configured
 */
function getSmtpConfig() {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || '').trim();
  const pass = rawPass.replace(/\s+/g, ''); // strip accidental spaces in App Passwords

  // Handle SMTP_SECURE: true for SSL port 465, false for STARTTLS port 587
  let secure = false;
  if (process.env.SMTP_SECURE !== undefined && process.env.SMTP_SECURE !== '') {
    secure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1';
  } else {
    secure = port === 465;
  }

  const fromName = (process.env.EMAIL_FROM_NAME || 'ResumeIQ Security').trim();
  let fromAddress = process.env.EMAIL_FROM;

  if (!fromAddress) {
    fromAddress = user ? `"${fromName}" <${user}>` : `"${fromName}" <security@resumeiq.ai>`;
  } else if (!fromAddress.includes('<') && user) {
    fromAddress = `"${fromName}" <${fromAddress.trim()}>`;
  }

  if (!user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from: fromAddress,
    fromName,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 12000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false
    }
  };
}

/**
 * Returns or creates the pooled Nodemailer transporter
 */
function getTransporter() {
  const config = getSmtpConfig();
  if (!config) {
    return { transporter: null, config: null };
  }

  const signature = `${config.host}:${config.port}:${config.secure}:${config.auth.user}:${config.auth.pass}`;
  if (!transporterInstance || currentConfigSignature !== signature) {
    transporterInstance = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      pool: config.pool,
      maxConnections: config.maxConnections,
      maxMessages: config.maxMessages,
      connectionTimeout: config.connectionTimeout,
      greetingTimeout: config.greetingTimeout,
      socketTimeout: config.socketTimeout,
      tls: config.tls
    });
    currentConfigSignature = signature;
  }

  return { transporter: transporterInstance, config };
}

/**
 * Diagnostic verification of SMTP connection
 */
async function verifySmtp() {
  const { transporter, config } = getTransporter();
  if (!transporter || !config) {
    return {
      configured: false,
      message: 'SMTP credentials are not configured. Please set SMTP_USER and SMTP_PASS in .env.'
    };
  }

  try {
    await transporter.verify();
    return {
      configured: true,
      verified: true,
      host: config.host,
      port: config.port,
      user: config.auth.user
    };
  } catch (err) {
    return {
      configured: true,
      verified: false,
      host: config.host,
      port: config.port,
      user: config.auth.user,
      error: err.message
    };
  }
}

/**
 * Generates ResumeIQ branded responsive HTML email template for 6-Digit OTP code
 */
function generateOtpEmailHtml(code, identifier, expiresInMinutes = 5) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ResumeIQ Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);" cellspacing="0" cellpadding="0">
          
          <!-- Deep Navy Header Panel -->
          <tr>
            <td style="background: linear-gradient(135deg, #0c1527 0%, #111c35 50%, #090e1a 100%); padding: 34px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- Sparkle Badge -->
                    <div style="display: inline-block; background-color: #4f46e5; width: 42px; height: 42px; border-radius: 12px; text-align: center; line-height: 42px; color: #ffffff; font-size: 22px; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);">
                      ✨
                    </div>
                    <div style="color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 4px;">
                      ResumeIQ
                    </div>
                    <div style="color: #94a3b8; font-size: 13px; font-weight: 500;">
                      Intelligent Applicant Screening &amp; Semantic Matching
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 34px 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">
                Your Recruiter Security Verification Code
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                You requested a secure One-Time Password to sign in to your ResumeIQ recruiter workspace for <strong style="color: #0f172a;">${identifier}</strong>. Use the code below to complete authentication:
              </p>

              <!-- OTP Code Display Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #f5f7ff; border: 2px dashed #818cf8; border-radius: 14px; padding: 26px 16px;">
                    <div style="font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 8px;">
                      Single-Use Security Code
                    </div>
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #3525cd; padding-left: 12px;">
                      ${code}
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 10px; font-weight: 500;">
                      ⏱️ Valid for <strong>${expiresInMinutes} minutes</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Information -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 26px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 5px;">
                      🛡️ Security Notice
                    </div>
                    <div style="font-size: 12px; color: #64748b; line-height: 1.55;">
                      Never share this code with anyone. ResumeIQ representatives will never contact you asking for your verification code. If you did not request this code, your account remains secure and you can safely ignore this email.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Best regards,<br>
                <strong style="color: #0f172a;">ResumeIQ Security Infrastructure Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #94a3b8; font-weight: 500;">
                &copy; 2026 ResumeIQ Platform &bull; Precision Recruiting Intelligence with Real-Time NLP
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                This automated security notification was delivered to ${identifier}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dispatch genuine OTP code via SMTP
 * @param {string} toEmail - Recipient email
 * @param {string} code - 6-digit verification code
 * @param {number} expiresInMinutes - Expiry in minutes (default 5)
 * @returns {Promise<Object>} Delivery result
 */
async function sendOTPEmail(toEmail, code, expiresInMinutes = 5) {
  const { transporter, config } = getTransporter();

  if (!transporter || !config) {
    const error = new Error('Email service is not configured. Please configure SMTP_USER and SMTP_PASS in .env.');
    error.status = 503;
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  const mailOptions = {
    from: config.from,
    to: toEmail,
    subject: `Your ResumeIQ Security Verification Code: ${code}`,
    text: `Your ResumeIQ security verification code is: ${code}\n\nThis single-use code is valid for ${expiresInMinutes} minutes.\n\nSecurity notice: Do not share this code with anyone. If you did not request this verification code, you can safely disregard this email.`,
    html: generateOtpEmailHtml(code, toEmail, expiresInMinutes)
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    console.log(`[Email Service] OTP verification email dispatched to: ${toEmail} (MessageId: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
      recipient: toEmail,
      isRealDelivery: true
    };
  } catch (err) {
    console.error(`[Email Service Error] Failed to send email to ${toEmail}:`, err.message);
    const deliveryErr = new Error(`Unable to deliver verification email: ${err.message}`);
    deliveryErr.status = 502;
    deliveryErr.originalError = err;
    throw deliveryErr;
  }
}

module.exports = {
  sendOTPEmail,
  getSmtpConfig,
  verifySmtp
};
