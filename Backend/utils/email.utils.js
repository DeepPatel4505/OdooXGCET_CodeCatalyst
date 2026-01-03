import nodemailer from "nodemailer";
import crypto from "crypto";

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const generateRandomPassword = (length = 12) => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

export const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Sends account creation email with login credentials
 * @param {string} email - User's email address
 * @param {string} loginId - The login ID (this is the same as employeeId from database)
 * @param {string} password - Auto-generated password
 * @param {string} firstName - User's first name
 * @param {string} resetToken - Password reset token for initial password change
 */
export const sendAccountCreationEmail = async (
  email,
  loginId, // loginId = employeeId (they are the same value)
  password,
  firstName,
  resetToken
) => {
  try {
    const transporter = createTransporter();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "WorkZen HRMS"}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Welcome to WorkZen HRMS - Your Account Credentials",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Credentials</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
            <h2 style="color: #2563eb; margin-top: 0;">Welcome to WorkZen HRMS!</h2>
            <p>Hello ${firstName},</p>
            <p>Your account has been created successfully. Below are your login credentials:</p>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2563eb; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="margin: 10px 0; font-size: 16px; color: #2563eb;"><strong>🔑 Your Login ID (Use this to sign in):</strong></p>
              <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #1e40af; background-color: #eff6ff; padding: 10px; border-radius: 4px; text-align: center; letter-spacing: 1px;">${loginId}</p>
              <p style="margin: 15px 0 5px 0; font-size: 14px; color: #666;">You can also login using your email address: <strong>${email}</strong></p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
              <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 3px; font-family: monospace;">${password}</code></p>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;"><strong>⚠️ Important:</strong></p>
              <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #92400e;">
                <li>You can login using your <strong>Login ID (${loginId})</strong> or your <strong>Email address</strong></li>
                <li>For security reasons, please change your password after your first login</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Change Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link in your browser:<br>
              <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px;">
              If you did not request this account, please contact your administrator immediately.
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Best regards,<br>
              WorkZen HRMS Team
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to WorkZen HRMS!
        
        Hello ${firstName},
        
        Your account has been created successfully. Below are your login credentials:
        
        ========================================
        YOUR LOGIN ID (Use this to sign in):
        ${loginId}
        ========================================
        
        You can also login using your email address: ${email}
        
        Email: ${email}
        Password: ${password}
        
        IMPORTANT:
        - You can login using your Login ID (${loginId}) or your Email address
        - For security reasons, please change your password after your first login
        
        Change Password: ${resetLink}
        
        If you did not request this account, please contact your administrator immediately.
        
        Best regards,
        WorkZen HRMS Team
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  try {
    const transporter = createTransporter();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "WorkZen HRMS"}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset Your WorkZen HRMS Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
            <h2 style="color: #2563eb; margin-top: 0;">Password Reset Request</h2>
            <p>Hello ${firstName},</p>
            <p>You have requested to reset your password. Click the button below to reset it:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link in your browser:<br>
              <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
            </p>
            
            <p style="color: #666; font-size: 12px;">
              This link will expire in 1 hour. If you did not request a password reset, please ignore this email.
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Best regards,<br>
              WorkZen HRMS Team
            </p>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

