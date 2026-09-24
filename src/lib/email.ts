import nodemailer from 'nodemailer';

export const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
    // Standard nodemailer transport (configure via .env in production)
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '1025'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
        }
    });

    await transporter.sendMail({
        from: process.env.SMTP_FROM || '"VeraLabel" <noreply@veralabel.local>',
        to,
        subject,
        html
    });
};

export const generatePasswordResetEmail = (otp: string, name: string): string => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>You requested a password reset. Here is your One-Time Password (OTP):</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; color: #4F46E5; background: #F3F4F6; padding: 10px 20px; display: inline-block; border-radius: 6px;">
            ${otp}
        </h1>
        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
    </div>
`;
