import { auth } from '@/lib/auth';

/**
 * Verifies that the current user is authenticated and has admin role
 * @returns User session if admin, null otherwise
 */
export async function verifyAdmin() {
    const session = await auth();

    if (!session || !session.user) {
        return null;
    }

    const userRole = (session.user as { role?: string }).role;

    if (userRole !== 'admin') {
        return null;
    }

    return session;
}

/**
 * Check if bypass mode is enabled for development
 */
export function isBypassEnabled() {
    return process.env.AUTH_BYPASS === 'true';
}
