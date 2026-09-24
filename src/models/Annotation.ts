import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnnotation extends Document {
    _id: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    imageId: string; // ID mapping to the NAS/S3 storage file
    userId: mongoose.Types.ObjectId; // The annotator or reviewer
    label: string; // The selected label from the Project's taxonomy
    roiData?: any; // JSON representation of bounding boxes, polygons, etc.
    notes?: string;
    isConsensus: boolean; // True if this is the final, resolved ground truth
    createdAt: Date;
    updatedAt: Date;
}

const AnnotationSchema = new Schema<IAnnotation>(
    {
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
        imageId: { type: String, required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        label: { type: String, required: true },
        roiData: { type: Schema.Types.Mixed }, // Flexible structure for various drawing tools
        notes: { type: String, trim: true },
        isConsensus: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Prevent a single user from submitting multiple independent annotations for the same image
// (They can update their existing annotation instead)
AnnotationSchema.index({ projectId: 1, imageId: 1, userId: 1 }, { unique: true });

const Annotation: Model<IAnnotation> = mongoose.models.Annotation || mongoose.model<IAnnotation>('Annotation', AnnotationSchema);
export default Annotation;
