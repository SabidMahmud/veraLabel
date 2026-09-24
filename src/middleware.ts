import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ISSUE 4 FIX: Define all valid VeraLabel roles in one place
const ANNOTATOR_ROLES  = ['annotator', 'reviewer', 'admin', 'researcher'];
const ADMIN_ROLES      = ['admin'];
const WORKSPACE_ROLES  = ['annotator', 'reviewer', 'admin', 'researcher'];

export async function middleware(request: NextRequest) {
    const bypass = process.env.AUTH_BYPASS === 'true';

    if (bypass) {
        return NextResponse.next();
    }

    const { pathname } = request.nextUrl;

    // Public routes — no token required
    const publicRoutes = [
        '/',
        '/login',
        '/admin/login',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/api/auth',
        '/_next',
        '/favicon',
    ];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    // Allow public routes and static files (e.g., .ico, .png, .css)
    if (isPublicRoute || pathname.includes('.')) {
        return NextResponse.next();
    }

    const cookieName = process.env.NODE_ENV === 'production'
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token';

    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName,
    });

    // Unauthenticated — redirect to appropriate login
    if (!token) {
        const isAdminPath = pathname.startsWith('/admin');
        const loginUrl    = new URL(isAdminPath ? '/admin/login' : '/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    const role = token.role as string;

    // /admin/* — only admins
    if (pathname.startsWith('/admin')) {
        if (!ADMIN_ROLES.includes(role)) {
            return NextResponse.redirect(new URL('/viewer', request.url));
        }
    }

    // /viewer — all authenticated roles
    // ISSUE 4 FIX: annotator, reviewer, researcher, admin can all access /viewer
    if (pathname.startsWith('/viewer')) {
        if (!WORKSPACE_ROLES.includes(role)) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // /api/admin/* — only admins
    if (pathname.startsWith('/api/admin')) {
        if (!ADMIN_ROLES.includes(role)) {
            return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match everything except Next.js internals and static assets
        '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
    ],
};
