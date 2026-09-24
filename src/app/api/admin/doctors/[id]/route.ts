import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/middleware-admin';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const VALID_ROLES = ['admin', 'researcher', 'annotator', 'reviewer'] as const;

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
    try {
        const session = await verifyAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
        }

        const { id } = await context.params;
        await connectDB();

        const user = await User.findById(id);
        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Soft delete — preserves audit trail and annotation history
        user.isActive = false;
        await user.save();

        return NextResponse.json({ message: 'User deactivated successfully.' });
    } catch (error) {
        console.error('[Admin User DELETE Error]', error);
        return NextResponse.json({ error: 'Failed to deactivate user.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const session = await verifyAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
        }

        const { id } = await context.params;
        const updates = await request.json();
        await connectDB();

        const user = await User.findById(id).select('+password');
        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Validate role if being changed
        if (updates.role && !VALID_ROLES.includes(updates.role)) {
            return NextResponse.json({
                error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}.`
            }, { status: 400 });
        }

        // Apply allowed updates
        if (updates.name)  user.name  = updates.name;
        if (updates.email) user.email = updates.email.toLowerCase();
        if (updates.role)  user.role  = updates.role;
        if (typeof updates.isActive === 'boolean') user.isActive = updates.isActive;

        // Password update — pre-save hook will hash it automatically
        if (updates.password && updates.password.length >= 8) {
            user.password = updates.password;
        }

        await user.save({ validateModifiedOnly: true });

        const updatedUser = await User.findById(id).select('-password');
        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('[Admin User PATCH Error]', error);
        return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
    }
}
