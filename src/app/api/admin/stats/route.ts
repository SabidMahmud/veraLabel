import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User, Annotation } from '@/models';
import { auth } from '@/lib/auth';

export async function GET(_request: NextRequest) {
    try {
        // Verify admin session
        const session = await auth();
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
        }

        await connectDB();

        // ISSUE 8 FIX: Use Annotation model (not deleted Diagnosis model)
        const totalAnnotators = await User.countDocuments({
            role: { $in: ['annotator', 'reviewer', 'researcher'] },
            isActive: true,
        });
        const totalAnnotations = await Annotation.countDocuments({});

        // Annotations in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentAnnotations = await Annotation.countDocuments({
            createdAt: { $gte: sevenDaysAgo },
        });

        // Annotation breakdown by label (dynamic — project agnostic)
        const annotationByLabel = await Annotation.aggregate([
            { $group: { _id: '$label', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Top active annotators
        const topAnnotators = await Annotation.aggregate([
            { $group: { _id: '$userId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]);

        const topAnnotatorsWithNames = await Promise.all(
            topAnnotators.map(async (entry) => {
                const user = await User.findById(entry._id).select('name email role');
                return {
                    userId:          entry._id,
                    userName:        user?.name || 'Unknown',
                    userEmail:       user?.email || '',
                    annotationCount: entry.count,
                };
            })
        );

        return NextResponse.json({
            totalAnnotators,
            totalAnnotations,
            recentActivity:       recentAnnotations,
            annotationByLabel:    annotationByLabel.reduce((acc: any, item: any) => {
                acc[item._id || 'Unlabeled'] = item.count;
                return acc;
            }, {}),
            topAnnotators: topAnnotatorsWithNames,
        });
    } catch (error) {
        console.error('[Admin Stats Error]', error);
        return NextResponse.json({ error: 'Failed to fetch statistics.' }, { status: 500 });
    }
}
