import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { auth } from '@/lib/auth';

const VALID_ROLES = ['admin', 'researcher', 'annotator', 'reviewer'] as const;

/**
 * ADMIN ONLY: Create a new user account with a specified role.
 * Protected by NextAuth session check.
 */
export async function POST(request: NextRequest) {
    try {
        // Require a valid admin session
        const session = await auth();
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
        }

        await connectDB();

        const { name, email, password, role } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        // ISSUE 4 FIX: Validate against the new VeraLabel role system
        const assignedRole = VALID_ROLES.includes(role) ? role : 'annotator';

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        }

        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            role: assignedRole,
        });

        return NextResponse.json({
            message: 'User account created successfully.',
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        }, { status: 201 });
    } catch (error) {
        console.error('[Create User Error]', error);
        return NextResponse.json({ error: 'Failed to create user account.' }, { status: 500 });
    }
}
