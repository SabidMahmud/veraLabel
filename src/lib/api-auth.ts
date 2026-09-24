import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'researcher' | 'annotator' | 'reviewer';
    specialization?: string;
    licenseNumber?: string;
}

/**
 * Get authenticated user from session
 * This is a helper function to be used in API routes
 */
export async function getAuthenticatedUser(
    request: NextRequest
): Promise<AuthUser | null> {
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
                    specialization: user.specialization,
                    licenseNumber: user.licenseNumber,
                };
            }
        }

        // Fallback to custom header (for development/testing)
        const userId = request.headers.get('x-user-id');
        if (userId) {
            await connectDB();
            const user = await User.findById(userId);
            if (user && user.isActive) {
                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    specialization: user.specialization,
                    licenseNumber: user.licenseNumber,
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
export async function requireAuth(
    request: NextRequest
): Promise<AuthUser | NextResponse> {
    const user = await getAuthenticatedUser(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return user;
}

/**
 * Middleware to require admin role
 * Returns 401 if not authenticated, 403 if not admin
 */
export async function requireAdmin(
    request: NextRequest
): Promise<AuthUser | NextResponse> {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
        return userOrResponse;
    }

    const user = userOrResponse as AuthUser;
    if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return user;
}
