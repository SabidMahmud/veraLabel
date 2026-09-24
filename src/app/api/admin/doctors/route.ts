import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/middleware-admin';
import connectDB from '@/lib/mongodb';
import { User, Annotation } from '@/models';

const VALID_ROLES = ['admin', 'researcher', 'annotator', 'reviewer'] as const;
type UserRole = typeof VALID_ROLES[number];

export async function GET(_request: NextRequest) {
    try {
        const session = await verifyAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
        }

        await connectDB();

        // ISSUE 4 FIX: Fetch all VeraLabel roles, not just 'doctor'
        const users = await User.find({ role: { $in: VALID_ROLES } }).select('-password').lean();

        // Replace Diagnosis.countDocuments with Annotation.countDocuments
        const usersWithStats = await Promise.all(
            users.map(async (user) => {
                const annotationCount = await Annotation.countDocuments({ userId: user._id });
                return { ...user, annotationCount };
            })
        );

        return NextResponse.json(usersWithStats);
    } catch (error) {
        console.error('[Admin Users GET Error]', error);
        return NextResponse.json({ error: 'Failed to fetch users.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await verifyAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
        }

        const { name, email, password, role } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        // ISSUE 4 FIX: Validate against the new VeraLabel role system
        const assignedRole: UserRole = VALID_ROLES.includes(role) ? role : 'annotator';

        await connectDB();

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        }

        const newUser = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            role: assignedRole,
            isActive: true,
        });

        return NextResponse.json({
            _id:      newUser._id,
            name:     newUser.name,
            email:    newUser.email,
            role:     newUser.role,
            isActive: newUser.isActive,
        }, { status: 201 });
    } catch (error) {
        console.error('[Admin Users POST Error]', error);
        return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
    }
}
