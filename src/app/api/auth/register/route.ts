import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const { name, email, password, role, specialization, licenseNumber } =
            await request.json();

        // Validate required fields
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Name, email, and password are required' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            );
        }

        // Create new user (password will be auto-hashed by the model)
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            role: role || 'annotator',
            specialization,
            licenseNumber,
        });

        // Return user without password
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            specialization: user.specialization,
            licenseNumber: user.licenseNumber,
            isActive: user.isActive,
            createdAt: user.createdAt,
        };

        return NextResponse.json(
            {
                message: 'User registered successfully',
                user: userResponse,
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error('Registration error:', error);

        // Handle validation errors
        if (
            typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            (error as { name: string }).name === 'ValidationError' &&
            'errors' in error
        ) {
            const messages = Object.values((error as { errors: Record<string, { message: string }> }).errors).map(
                (err) => err.message
            );
            return NextResponse.json(
                { error: 'Validation error', details: messages },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to register user' },
            { status: 500 }
        );
    }
}
