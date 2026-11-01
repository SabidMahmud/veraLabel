import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
export const dynamic = 'force-dynamic';
export async function GET() {
    try {
        const mongoose = await connectDB();
        await mongoose.connection.db!.admin().ping();
        return NextResponse.json({ status: 'ready' });
    } catch {
        return NextResponse.json({ status: 'unavailable' }, { status: 503 });
    }
}
