import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import { Project } from '@/models';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        // BUG 2 FIX: Use shared connectDB() utility
        await connectDB();

        // Next.js 15: params is a Promise
        const { id } = await params;

        // ISSUE 7 FIX: Validate ObjectId format before querying to prevent CastError 500s
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid project ID format.' }, { status: 400 });
        }

        const project = await Project.findById(id);

        if (!project) {
            return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
        }

        return NextResponse.json(project, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
