import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { email, otp, newPassword } = await request.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json({
                error: 'Email, OTP, and new password are required'
            }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({
                error: 'Password must be at least 8 characters'
            }, { status: 400 });
        }

        await connectDB();

        // Find user with reset token fields
        const user = await User.findOne({
            email: email.toLowerCase(),
            isActive: true,
        }).select('+resetPasswordOTP +resetPasswordExpires');

        if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
            return NextResponse.json({
                error: 'Invalid or expired OTP'
            }, { status: 400 });
        }

        // Check if OTP is expired
        if (user.resetPasswordExpires < new Date()) {
            // Clear expired OTP
            user.resetPasswordOTP = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            return NextResponse.json({
                error: 'OTP has expired. Please request a new one.'
            }, { status: 400 });
        }

        // Hash the provided OTP and compare with stored hash
        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

        if (hashedOTP !== user.resetPasswordOTP) {
            return NextResponse.json({
                error: 'Invalid OTP'
            }, { status: 400 });
        }

        // Update password and clear reset fields
        user.password = newPassword;
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return NextResponse.json({
            message: 'Password has been reset successfully. You can now login with your new password.'
        });
    } catch (error) {
        console.error('Error in reset password:', error);
        return NextResponse.json({
            error: 'An error occurred. Please try again.'
        }, { status: 500 });
    }
}
