import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateOTP, sendEmail, generatePasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        await connectDB();

        const user = await User.findOne({
            email: email.toLowerCase(),
            isActive: true,
        });

        if (!user) {
            // Don't reveal if user exists or not for security
            return NextResponse.json({
                message: 'If that email exists, we sent a password reset OTP to it.'
            });
        }

        // Generate 6-digit OTP
        const otp = generateOTP();

        // Hash the OTP before storing
        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

        // Set OTP and expiration (10 minutes)
        user.resetPasswordOTP = hashedOTP;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        // Send email with OTP
        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset OTP - VeraLabel System',
                html: generatePasswordResetEmail(otp, user.name),
            });

            return NextResponse.json({
                message: 'Password reset OTP has been sent to your email.'
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return NextResponse.json({
                error: 'Failed to send email. Please try again later.'
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error in forgot password:', error);
        return NextResponse.json({
            error: 'An error occurred. Please try again.'
        }, { status: 500 });
    }
}
