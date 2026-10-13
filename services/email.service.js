/**
 * Email Service for ResumeIQ Authentication
 * Sends genuine OTP verification emails and notifications using Nodemailer.
 * Supports custom SMTP (Gmail, Outlook, SendGrid, Amazon SES) with automatic
 * Ethereal test account generation for immediate local preview if SMTP credentials are unset.
 */

const nodemailer = require('nodemailer');

let etherealTransporter = null;
let etherealAccountPromise = null;

/**
 * Check if custom SMTP is configured in environment
 */
function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (user && pass) {
    if (host && host !== 'smtp.gmail.com') {
      return {
        host,
        port,
        secure,
        auth: { user, pass },
        from: process.env.EMAIL_FROM || process.env.SMTP_FROM || `"ResumeIQ Security" <${user}>`
      };
    }
    // Default to Gmail native configuration
    return {
      service: 'gmail',
      auth: { user, pass },
      from: process.env.EMAIL_FROM || `"ResumeIQ Security" <${user}>`
    };
  }

  return null;
}

/**
 * Get or create an Ethereal transporter for zero-config testing
 */
async function getEtherealTransporter() {
  if (etherealTransporter) return etherealTransporter;

  if (!etherealAccountPromise) {
    etherealAccountPromise = nodemailer.createTestAccount();
  }

  const testAccount = await etherealAccountPromise;
  etherealTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  return etherealTransporter;
}

/**
 * Generates modern Stitch-themed HTML email template for 6-Digit OTP code
 */
function generateOtpEmailHtml(code, identifier, expiresInMinutes = 5) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ResumeIQ Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner (Stitch Deep Navy) -->
          <tr>
            <td style="background: linear-gradient(135deg, #0c1527 0%, #111c35 50%, #090e1a 100%); padding: 36px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- Brand -->
                    <div style="display: inline-block; background-color: #4f46e5; width: 40px; height: 40px; border-radius: 10px; text-align: center; line-height: 40px; color: #ffffff; font-size: 20px; font-weight: bold; margin-bottom: 12px;">
                      ✨
                    </div>
                    <div style="color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 4px;">
                      ResumeIQ
                    </div>
                    <div style="color: #94a3b8; font-size: 13px; font-weight: 500;">
                      Intelligent Applicant Screening & Semantic Matching
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;">
                Your Recruiter Security Verification Code
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                You requested a secure One-Time Password to access your recruiter workspace for <strong>${identifier}</strong>. Use the code below to complete sign-in:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #f5f7ff; border: 2px dashed #818cf8; border-radius: 12px; padding: 24px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
                      Single-Use Security Code
                    </div>
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #3525cd; padding-left: 10px;">
                      ${code}
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
                      ⏱️ Valid for <strong>${expiresInMinutes} minutes</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Information -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">
                      🛡️ Security Reminder
                    </div>
                    <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
                      Never share this code with anyone. ResumeIQ team members will never ask for your verification code. If you did not request this code, you can safely disregard this email.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Best regards,<br>
                <strong style="color: #0f172a;">ResumeIQ Security Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #94a3b8;">
                © 2026 ResumeIQ Platform • Intelligent Applicant Screening System
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                This automated security notification was sent to ${identifier}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send an OTP code to a recipient email
 * @param {string} toEmail - Recipient email
 * @param {string} code - 6-digit verification code
 * @param {number} expiresInMinutes - Expiration time in minutes
 * @returns {Promise<Object>} Delivery details
 */
async function sendOTPEmail(toEmail, code, expiresInMinutes = 5) {
  const customConfig = getSmtpConfig();
  let transporter;
  let isCustom = false;
  let fromAddress = '"ResumeIQ Security" <security@resumeiq.ai>';

  if (customConfig) {
    transporter = nodemailer.createTransport(customConfig);
    isCustom = true;
    fromAddress = customConfig.from;
  } else {
    transporter = await getEtherealTransporter();
    fromAddress = '"ResumeIQ Security" <auth@resumeiq.ai>';
  }

  const mailOptions = {
    from: fromAddress,
    to: toEmail,
    subject: `${code} is your ResumeIQ verification code`,
    text: `Your ResumeIQ verification code is: ${code}. This code expires in ${expiresInMinutes} minutes. If you did not request this code, please ignore this email.`,
    html: generateOtpEmailHtml(code, toEmail, expiresInMinutes)
  };

  const info = await transporter.sendMail(mailOptions);
  let previewUrl = null;

  if (!isCustom) {
    previewUrl = nodemailer.getTestMessageUrl(info);
  }

  console.log(`\n============================================================`);
  console.log(`📧 [Email Service] OTP email dispatched for: ${toEmail}`);
  console.log(`🔑 Code: ${code} (Expires in ${expiresInMinutes} mins)`);
  console.log(`📦 Message ID: ${info.messageId}`);
  if (isCustom) {
    console.log(`🚀 Delivered via Custom SMTP / Gmail!`);
  } else if (previewUrl) {
    console.log(`🌐 Live Ethereal Preview URL: ${previewUrl}`);
  }
  console.log(`============================================================\n`);

  return {
    success: true,
    messageId: info.messageId,
    previewUrl: previewUrl || null,
    isRealDelivery: isCustom,
    recipient: toEmail
  };
}

module.exports = {
  sendOTPEmail,
  getSmtpConfig
};
