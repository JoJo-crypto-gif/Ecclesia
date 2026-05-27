import nodemailer from 'nodemailer';

// You can configure this with your actual Google SMTP credentials or any other provider
// For testing/development, this will work if configured, otherwise we'll mock it or log it
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'test@example.com',
    pass: process.env.SMTP_PASS || 'password',
  },
});

const EmailService = {
  async sendOTP(email, code) {
    // If no real credentials are provided, we just log it (useful for local dev without spamming real emails)
    if (!process.env.SMTP_USER) {
      console.log(`[MOCK EMAIL] To: ${email} | Subject: Your Ecclesia Security Code | Code: ${code}`);
      return true;
    }

    try {
      const info = await transporter.sendMail({
        from: `"Ecclesia CMS" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Ecclesia Security Code',
        text: `Your one-time security code is: ${code}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; text-align: center;">Ecclesia Security</h2>
            <p style="color: #334155; font-size: 16px;">Hello,</p>
            <p style="color: #334155; font-size: 16px;">Someone is trying to sign into your Ecclesia account. Here is your one-time passcode:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0f172a; padding: 10px 20px; background-color: #f1f5f9; border-radius: 8px;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you did not request this code, please ignore this email or contact your administrator.</p>
          </div>
        `,
      });
      console.log(`Message sent: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      // We don't throw here so we don't crash the server, but the caller should check if it needs to
      return false;
    }
  },

  async sendPasswordReset(email, temporaryPassword, expiresInMinutes = 30) {
    if (!process.env.SMTP_USER) {
      console.log(`[MOCK EMAIL] To: ${email} | Subject: Your Ecclesia Temporary Password | Temporary Password: ${temporaryPassword}`);
      return true;
    }

    try {
      const info = await transporter.sendMail({
        from: `"Ecclesia CMS" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Ecclesia Temporary Password',
        text: `Your temporary Ecclesia password is: ${temporaryPassword}. It expires in ${expiresInMinutes} minutes. After signing in, you must choose a new password.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; text-align: center;">Ecclesia Password Reset</h2>
            <p style="color: #334155; font-size: 16px;">Hello,</p>
            <p style="color: #334155; font-size: 16px;">Use this temporary password to sign in to your Ecclesia account:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 2px; color: #0f172a; padding: 12px 18px; background-color: #f1f5f9; border-radius: 8px;">${temporaryPassword}</span>
            </div>
            <p style="color: #64748b; font-size: 14px; text-align: center;">This temporary password expires in ${expiresInMinutes} minutes. You will be asked to choose a new password immediately after signing in.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you did not request this reset, contact your administrator.</p>
          </div>
        `,
      });
      console.log(`Password reset email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  },

  /**
   * Send a rich HTML email with optional attachments.
   *
   * @param {Object} options
   * @param {string[]} options.to           - Array of recipient email addresses (sent as BCC for privacy)
   * @param {string}   options.subject      - Email subject line
   * @param {string}   options.html         - Full HTML body
   * @param {Array}    [options.attachments] - Array of { filename, content (base64 string), contentType }
   * @returns {{ success: boolean, mocked?: boolean, error?: string }}
   */
  async sendMail({ to, subject, html, attachments = [] }) {
    const recipients = Array.isArray(to) ? to : [to];

    if (recipients.length === 0) {
      return { success: false, error: 'No recipients provided' };
    }

    // Mock mode when no SMTP credentials are configured
    if (!process.env.SMTP_USER) {
      console.log(`[MOCK EMAIL] BCC: ${recipients.length} recipients | Subject: ${subject}`);
      console.log(`[MOCK EMAIL] HTML length: ${html?.length || 0} chars`);
      if (attachments.length > 0) {
        console.log(`[MOCK EMAIL] Attachments: ${attachments.map(a => a.filename).join(', ')}`);
      }
      return { success: true, mocked: true };
    }

    try {
      // Convert base64 attachment payloads to nodemailer buffer format
      const nodemailerAttachments = attachments.map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType || 'application/octet-stream',
      }));

      const mailOptions = {
        from: `"Ecclesia CMS" <${process.env.SMTP_USER}>`,
        bcc: recipients,               // BCC to protect member privacy
        subject: subject || '(No Subject)',
        html: html || '',
        attachments: nodemailerAttachments,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email] Sent to ${recipients.length} recipients. MessageId: ${info.messageId}`);
      return { success: true };
    } catch (error) {
      console.error('[Email] Send failed:', error.message);
      return { success: false, error: error.message };
    }
  }
};

export default EmailService;
