import { NextResponse } from 'next/server';

// Private research deployments provision users through the administrator.
export async function POST() {
    return NextResponse.json({ error: 'Ask your administrator to create an account.' }, { status: 403 });
}
