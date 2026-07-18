import nodemailer from 'nodemailer';

// Configure SMTP transport using Gmail credentials from environment variables
let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: {
        user: process.env.SMTP_USER || 'oraviapvtltd5@gmail.com',
        pass: process.env.SMTP_PASS || 'urlt valv fkxw yqeq',
      },
    });
  }
  return _transporter;
}

/**
 * Sends a monochromatic, high-fidelity HTML email containing the OTP code.
 * @param {string} toEmail - Recipient email address
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} purpose - 'register' or 'forgot_password'
 * @returns {Promise<boolean>} Success status
 */
export const sendOTPEmail = async (toEmail, otpCode, purpose) => {
  const isRegister = purpose === 'register';
  
  const title = isRegister ? 'Verify Your Oravia Account' : 'Reset Your Oravia Password';
  const subtitle = isRegister 
    ? 'Welcome to Oravia! Please use the OTP code below to verify your email and activate your account.' 
    : 'We received a request to reset your password. Use the OTP code below to complete the reset process.';
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Oravia Admin" <oraviapvtltd5@gmail.com>',
    to: toEmail,
    subject: isRegister ? '[Oravia] Verify Email OTP' : '[Oravia] Reset Password OTP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #000000;
            color: #f4f4f5;
            margin: 0;
            padding: 40px 20px;
          }
          .email-card {
            max-width: 480px;
            margin: 0 auto;
            background-color: #0b0b0d;
            border: 1px solid #27272a;
            border-radius: 16px;
            padding: 32px;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.03em;
            margin-bottom: 24px;
          }
          h2 {
            font-size: 20px;
            color: #ffffff;
            margin-bottom: 12px;
            font-weight: 700;
          }
          p {
            font-size: 14px;
            color: #a1a1aa;
            line-height: 1.5;
            margin-bottom: 28px;
          }
          .otp-container {
            background-color: #16161a;
            border: 1px dashed #3f3f46;
            border-radius: 12px;
            padding: 16px;
            font-size: 32px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 0.15em;
            margin-bottom: 28px;
            display: inline-block;
            min-width: 200px;
          }
          .footer {
            font-size: 11px;
            color: #52525b;
            margin-top: 32px;
            border-top: 1px solid #18181b;
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="email-card">
          <div class="logo">ORAVIA</div>
          <h2>${title}</h2>
          <p>${subtitle}</p>
          <div class="otp-container">${otpCode}</div>
          <p style="font-size: 12px; color: #71717a; margin-top: 0;">This code is valid for 10 minutes. Do not share this OTP with anyone.</p>
          <div class="footer">
            &copy; 2026 Oravia Pvt Ltd. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`Email dispatched to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send verification email to ${toEmail}:`, error.message);
    return false;
  }
};
