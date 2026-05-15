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
  }
};

export default EmailService;
