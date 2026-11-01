import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
export const dynamic = 'force-dynamic';
export async function GET() {
    const user = await requireAuth();
    return user instanceof NextResponse ? user : new NextResponse(null, { status: 204 });
}
