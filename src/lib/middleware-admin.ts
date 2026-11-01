import { getAuthenticatedUser } from '@/lib/api-auth';

/**
 * Verifies that the current user is authenticated and has admin role
 * @returns User session if admin, null otherwise
 */
export async function verifyAdmin() {
    const user = await getAuthenticatedUser();
    return user?.role === 'admin' ? user : null;
}

/**
 * Check if bypass mode is enabled for development
 */
export function isBypassEnabled() {
    return process.env.AUTH_BYPASS === 'true';
}
