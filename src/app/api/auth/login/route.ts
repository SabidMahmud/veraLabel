import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const { email, password } = await request.json();

        // Validate required fields
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user and include password field (normally excluded)
        const user = await User.findOne({ email: email.toLowerCase() }).select(
            '+password'
        );

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Check if user is active
        if (!user.isActive) {
            return NextResponse.json(
                { error: 'Account is deactivated. Please contact administrator.' },
                { status: 403 }
            );
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Return user data without password
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            specialization: user.specialization,
            licenseNumber: user.licenseNumber,
            isActive: user.isActive,
        };

        return NextResponse.json({
            message: 'Login successful',
            user: userResponse,
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Failed to authenticate user' },
            { status: 500 }
        );
    }
}
