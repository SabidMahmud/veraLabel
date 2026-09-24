import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import { Image, Annotation } from '@/models';

export async function GET(req: NextRequest) {
    try {
        // BUG 2 FIX: Use shared connectDB() utility (singleton connection pool)
        await connectDB();

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');
        const userId = searchParams.get('userId');

        if (!projectId || !userId) {
            return NextResponse.json({ error: 'Missing projectId or userId' }, { status: 400 });
        }

        // Validate ObjectId formats upfront to prevent CastErrors
        if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Invalid ID format for projectId or userId.' }, { status: 400 });
        }

        // BUG 5 FIX: Cast to ObjectId so the $nin exclusion actually matches
        const projectOid = new mongoose.Types.ObjectId(projectId);
        const userOid    = new mongoose.Types.ObjectId(userId);

        // 1. Find all imageIds this user has already annotated for this project
        const userAnnotations = await Annotation.find({
            projectId: projectOid,
            userId:    userOid,
        }).select('imageId');

        const annotatedImageIds = userAnnotations.map(a => a.imageId);

        // 2. Find the oldest pending/annotating image not yet touched by this user
        const nextImage = await Image.findOne({
            projectId: projectOid,
            _id:    { $nin: annotatedImageIds },
            status: { $in: ['pending', 'annotating'] },
        }).sort({ createdAt: 1 });

        if (!nextImage) {
            return NextResponse.json(
                { message: 'No more images to annotate in this project.' },
                { status: 404 }
            );
        }

        return NextResponse.json(nextImage, { status: 200 });
    } catch (error: any) {
        console.error('[Queue API Error]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
