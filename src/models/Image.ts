import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IImage extends Document {
    _id: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    filename: string;
    path: string; // URL path to be served by Nginx (e.g., /images/project1/001.jpg)
    status: 'pending' | 'annotating' | 'conflict' | 'completed';
    annotationCount: number; // Cache to quickly check against consensusRequired
    createdAt: Date;
    updatedAt: Date;
}

const ImageSchema = new Schema<IImage>(
    {
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
        filename: { type: String, required: true },
        path: { type: String, required: true },
        status: { 
            type: String, 
            enum: ['pending', 'annotating', 'conflict', 'completed'], 
            default: 'pending',
            index: true
        },
        annotationCount: { type: Number, default: 0 }
    },
    { timestamps: true }
);

ImageSchema.index({ projectId: 1, filename: 1 }, { unique: true });

const Image: Model<IImage> = mongoose.models.Image || mongoose.model<IImage>('Image', ImageSchema);
export default Image;
