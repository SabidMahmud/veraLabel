import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'researcher' | 'annotator' | 'reviewer';
}

/**
 * Get authenticated user from session
 * This is a helper function to be used in API routes
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
    try {
        // Try NextAuth session first
        const session = await auth();
        if (session?.user?.email) {
            await connectDB();
            const user = await User.findOne({ email: session.user.email });
            if (user && user.isActive) {
                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error getting authenticated user:', error);
        return null;
    }
}

/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 */
export async function requireAuth(): Promise<AuthUser | NextResponse> {
    const user = await getAuthenticatedUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return user;
}

/**
 * Middleware to require admin role
 * Returns 401 if not authenticated, 403 if not admin
 */
export async function requireAdmin(): Promise<AuthUser | NextResponse> {
    const userOrResponse = await requireAuth();
    if (userOrResponse instanceof NextResponse) {
        return userOrResponse;
    }

    const user = userOrResponse as AuthUser;
    if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return user;
}
