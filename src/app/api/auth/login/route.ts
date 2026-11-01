import { NextResponse } from 'next/server';

// Sessions must be issued by NextAuth, not the former user-data-only endpoint.
export async function POST() {
    return NextResponse.json({ error: 'Use the sign-in page to start a session.' }, { status: 410 });
}
