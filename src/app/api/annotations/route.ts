import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import { Annotation, Project, Image } from '@/models';

export async function POST(req: NextRequest) {
    try {
        // BUG 2 FIX: Use shared connectDB() utility
        await connectDB();

        const body = await req.json();
        const { projectId, imageId, userId, label } = body;

        // --- Strict Validation ---
        if (!projectId || !imageId || !userId || !label) {
            return NextResponse.json({ error: 'Missing required fields: projectId, imageId, userId, label.' }, { status: 400 });
        }

        // ISSUE 13 FIX: Validate all ID fields consistently
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return NextResponse.json({ error: 'Invalid projectId format.' }, { status: 400 });
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Invalid userId format.' }, { status: 400 });
        }
        if (!mongoose.Types.ObjectId.isValid(imageId)) {
            return NextResponse.json({ error: 'Invalid imageId format.' }, { status: 400 });
        }

        const projectOid = new mongoose.Types.ObjectId(projectId);
        const userOid    = new mongoose.Types.ObjectId(userId);
        const imageOid   = new mongoose.Types.ObjectId(imageId);

        // 1. Verify Project and label exist
        const project = await Project.findById(projectOid);
        if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

        const validLabel = project.labels.find((l: any) => l.name === label);
        if (!validLabel) {
            return NextResponse.json({ error: `Invalid label "${label}" for this project.` }, { status: 400 });
        }

        // 2. Upsert annotation (allows changing label if annotator reconsiders)
        const annotation = await Annotation.findOneAndUpdate(
            { projectId: projectOid, imageId: imageOid, userId: userOid },
            { projectId: projectOid, imageId: imageOid, userId: userOid, label, notes: body.notes, isConsensus: false },
            { new: true, upsert: true, runValidators: true }
        );

        // 3. Recalculate and update image status
        const image = await Image.findOne({ _id: imageOid, projectId: projectOid });
        if (image) {
            const annotationCount = await Annotation.countDocuments({
                projectId: projectOid,
                imageId:   imageOid,
                isConsensus: false,
            });
            image.annotationCount = annotationCount;

            // Use >= to handle any race conditions where count may exceed threshold
            if (annotationCount >= project.consensusRequired) {
                image.status = 'completed';
            } else {
                image.status = 'annotating';
            }
            await image.save();
        }

        return NextResponse.json(annotation, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ error: 'Duplicate annotation conflict.' }, { status: 409 });
        }
        console.error('[Annotations POST Error]', error);
        return NextResponse.json({ error: 'Internal Server Error while saving annotation.' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        // BUG 2 FIX: Use shared connectDB() utility
        await connectDB();

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');
        const imageId   = searchParams.get('imageId');

        const query: any = {};

        if (projectId) {
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return NextResponse.json({ error: 'Invalid projectId format.' }, { status: 400 });
            }
            query.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (imageId) {
            if (!mongoose.Types.ObjectId.isValid(imageId)) {
                return NextResponse.json({ error: 'Invalid imageId format.' }, { status: 400 });
            }
            query.imageId = new mongoose.Types.ObjectId(imageId);
        }

        const annotations = await Annotation.find(query).populate('userId', 'name role');
        return NextResponse.json(annotations, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error fetching annotations.' }, { status: 500 });
    }
}
