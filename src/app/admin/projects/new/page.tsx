'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProjectPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [consensusRequired, setConsensusRequired] = useState(1);
    
    // Default labels to start with
    const [labels, setLabels] = useState([
        { name: 'Normal', color: '#10B981', description: '' },
        { name: 'Abnormal', color: '#EF4444', description: '' }
    ]);
    
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddLabel = () => {
        setLabels([...labels, { name: '', color: '#3B82F6', description: '' }]);
    };

    const handleRemoveLabel = (index: number) => {
        const newLabels = [...labels];
        newLabels.splice(index, 1);
        setLabels(newLabels);
    };

    const handleLabelChange = (index: number, field: string, value: string) => {
        const newLabels = [...labels] as any;
        newLabels[index][field] = value;
        setLabels(newLabels);
    };

    const validateForm = () => {
        if (!name.trim()) return 'Project name is required.';
        if (!description.trim()) return 'Project description is required.';
        if (labels.length < 2) return 'You must have at least 2 labels for a classification project.';
        
        const labelNames = new Set();
        for (let i = 0; i < labels.length; i++) {
            const lblName = labels[i].name.trim();
            if (!lblName) return `Label #${i + 1} is missing a name.`;
            if (labelNames.has(lblName.toLowerCase())) return `Duplicate label detected: "${lblName}". Labels must be unique.`;
            labelNames.add(lblName.toLowerCase());
        }
        
        if (consensusRequired < 1) return 'Consensus required must be at least 1.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    consensusRequired,
                    labels
                })
            });

            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Failed to create project');
            }

            // Success! Redirect to the admin projects list (or viewer)
            router.push('/admin/dashboard'); 
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-200 bg-gray-900">
                    <h1 className="text-2xl font-bold text-white">Create New Research Project</h1>
                    <p className="mt-1 text-gray-300 text-sm">Define your dataset taxonomy and cross-validation rules.</p>
                </div>

                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-8">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">1. General Information</h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Project Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                placeholder="e.g., Skin Lesion Classification"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description / Annotator Instructions</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                placeholder="Provide instructions for the doctors on what to look for..."
                            />
                        </div>
                    </div>

                    {/* Taxonomy / Labels */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b pb-2">
                            <h2 className="text-lg font-semibold text-gray-800">2. Define Labels (Taxonomy)</h2>
                            <button
                                type="button"
                                onClick={handleAddLabel}
                                className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 font-medium transition"
                            >
                                + Add Label
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {labels.map((label, index) => (
                                <div key={index} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Label Name</label>
                                        <input
                                            type="text"
                                            value={label.name}
                                            onChange={(e) => handleLabelChange(index, 'name', e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                            placeholder="e.g., Benign"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description (Optional)</label>
                                        <input
                                            type="text"
                                            value={label.description}
                                            onChange={(e) => handleLabelChange(index, 'description', e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                            placeholder="Criteria for this label..."
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Color</label>
                                        <input
                                            type="color"
                                            value={label.color}
                                            onChange={(e) => handleLabelChange(index, 'color', e.target.value)}
                                            className="block w-full h-9 rounded-md border-gray-300 cursor-pointer"
                                        />
                                    </div>
                                    <div className="pt-5">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLabel(index)}
                                            className="text-red-500 hover:text-red-700 p-2"
                                            title="Remove Label"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Workflow Settings */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">3. Workflow Rules</h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Consensus Required (Cross-Validation)</label>
                            <p className="text-xs text-gray-500 mb-2">How many distinct annotators must label an image before it is considered complete?</p>
                            <input
                                type="number"
                                min="1"
                                value={consensusRequired}
                                onChange={(e) => setConsensusRequired(parseInt(e.target.value) || 1)}
                                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-6 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors
                                ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} 
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        >
                            {isSubmitting ? 'Creating Project...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
