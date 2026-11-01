import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import { Project } from '@/models';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth();
        if (user instanceof NextResponse) return user;
        // BUG 2 FIX: Use shared connectDB() utility
        await connectDB();
        const projects = await Project.find({}).sort({ createdAt: -1 });
        return NextResponse.json(projects, { status: 200 });
    } catch (error: unknown) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        if (user instanceof NextResponse) return user;
        if (!['admin', 'researcher'].includes(user.role)) {
            return NextResponse.json({ error: 'Researcher access required.' }, { status: 403 });
        }
        // BUG 2 FIX: Use shared connectDB() utility
        await connectDB();

        const body = await req.json();

        // --- Strict Validation ---
        if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
            return NextResponse.json({ error: 'Project name is required and cannot be empty.' }, { status: 400 });
        }
        if (!body.description || typeof body.description !== 'string' || body.description.trim() === '') {
            return NextResponse.json({ error: 'Project description is required.' }, { status: 400 });
        }
        if (!body.labels || !Array.isArray(body.labels) || body.labels.length < 2) {
            return NextResponse.json({ error: 'A project must have at least 2 labels for classification.' }, { status: 400 });
        }

        const labelNames = new Set<string>();
        for (const label of body.labels) {
            if (typeof label.name !== 'string' || label.name.trim() === '') {
                return NextResponse.json({ error: 'All labels must have a valid name.' }, { status: 400 });
            }
            const normalized = label.name.trim().toLowerCase();
            if (labelNames.has(normalized)) {
                return NextResponse.json({ error: `Duplicate label detected: "${label.name}". Labels must be unique.` }, { status: 400 });
            }
            labelNames.add(normalized);
        }

        if (!Number.isInteger(body.consensusRequired) || body.consensusRequired < 1) {
            return NextResponse.json({ error: 'Consensus required must be at least 1.' }, { status: 400 });
        }

        const project = await Project.create({
            name: body.name.trim(), description: body.description.trim(),
            labels: body.labels, consensusRequired: body.consensusRequired,
            ownerId: new mongoose.Types.ObjectId(user.id),
        });
        return NextResponse.json(project, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof mongoose.Error.ValidationError) {
            const messages = Object.values(error.errors).map((val) => val.message);
            return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
