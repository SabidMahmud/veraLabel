'use client';

import React, { useState, useEffect } from 'react';

interface Label {
    name: string;
    color: string;
    description?: string;
}

interface Project {
    _id: string;
    name: string;
    description: string;
    labels: Label[];
}

interface AnnotationPanelProps {
    projectId: string;
    imageId: string;
    userId: string; // Temporarily passed as prop until Auth context is fully wired
    onAnnotationSaved: () => void;
}

export default function AnnotationPanel({ projectId, imageId, userId, onAnnotationSaved }: AnnotationPanelProps) {
    const [project, setProject] = useState<Project | null>(null);
    const [selectedLabel, setSelectedLabel] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const res = await fetch(`/api/projects/${projectId}`);
                if (!res.ok) throw new Error('Failed to load project configuration');
                const data = await res.json();
                setProject(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (projectId) fetchProject();
    }, [projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLabel) {
            setError('Please select a label.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/annotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    imageId,
                    userId,
                    label: selectedLabel,
                    notes
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save annotation');
            }

            // Reset UI and notify parent component to fetch the next image
            setSelectedLabel('');
            setNotes('');
            onAnnotationSaved();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-4 text-gray-500 animate-pulse">Loading workspace...</div>;
    if (error && !project) return <div className="p-4 text-red-500">Error: {error}</div>;
    if (!project) return <div className="p-4">Project not found.</div>;

    return (
        <div className="bg-white border-l border-gray-200 h-full flex flex-col p-6 shadow-lg">
            <div className="mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">{project.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{project.description}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">Select Classification</h3>
                    
                    {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

                    <div className="space-y-3">
                        {project.labels.map((lbl) => (
                            <label
                                key={lbl.name}
                                className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${
                                    selectedLabel === lbl.name 
                                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center h-5">
                                    <input
                                        type="radio"
                                        name="annotation_label"
                                        value={lbl.name}
                                        checked={selectedLabel === lbl.name}
                                        onChange={(e) => setSelectedLabel(e.target.value)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="ml-3 flex flex-col">
                                    <div className="flex items-center">
                                        <span 
                                            className="w-3 h-3 rounded-full mr-2" 
                                            style={{ backgroundColor: lbl.color || '#ccc' }} 
                                        />
                                        <span className="text-sm font-medium text-gray-900">{lbl.name}</span>
                                    </div>
                                    {lbl.description && (
                                        <span className="text-xs text-gray-500 mt-1">{lbl.description}</span>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">Clinical Notes (Optional)</h3>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Add any specific observations or rationale here..."
                        />
                    </div>
                </div>

                <div className="pt-6 mt-auto border-t">
                    <button
                        type="submit"
                        disabled={submitting || !selectedLabel}
                        className={`w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
                            ${submitting || !selectedLabel ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} 
                            transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    >
                        {submitting ? 'Saving...' : 'Save & Next Image'}
                    </button>
                </div>
            </form>
        </div>
    );
}
