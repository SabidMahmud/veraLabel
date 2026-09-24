import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILabel {
    name: string;
    color: string;
    description?: string;
}

export interface IProject extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;
    labels: ILabel[];
    consensusRequired: number; // Number of overlapping annotations needed for cross-validation
    ownerId: mongoose.Types.ObjectId; // The researcher who created it
    createdAt: Date;
    updatedAt: Date;
}

const LabelSchema = new Schema<ILabel>({
    name: { type: String, required: true, trim: true },
    color: { type: String, default: '#000000' },
    description: { type: String, trim: true }
});

const ProjectSchema = new Schema<IProject>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        labels: [LabelSchema],
        consensusRequired: { type: Number, default: 1, min: 1 },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
    },
    { timestamps: true }
);

const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
export default Project;
