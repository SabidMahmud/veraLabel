'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AnnotationPanel from '@/components/AnnotationPanel';
import ImageViewer from '@/components/ImageViewer';
import { ViewableSlide } from '@/types/types';

function ViewerContent() {
    const searchParams    = useSearchParams();
    const projectId       = searchParams.get('projectId');
    const { data: session, status } = useSession();
    const router          = useRouter();

    const [currentImage, setCurrentImage] = useState<any>(null);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState('');

    // ISSUE 6 FIX: Read userId from the secure NextAuth session, not from URL params
    const userId = (session?.user as any)?.id as string | undefined;

    // Redirect to login if unauthenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    const fetchNextImage = async () => {
        if (!projectId || !userId) return;

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/images/queue?projectId=${projectId}&userId=${userId}`);

            if (res.status === 404) {
                setCurrentImage(null);
                setError('All caught up! No more images to annotate for this project.');
                return;
            }
            if (!res.ok) throw new Error('Failed to fetch the next image.');

            const data = await res.json();
            setCurrentImage(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch once session is ready and projectId is present
        if (status === 'authenticated' && projectId && userId) {
            fetchNextImage();
        }
    }, [status, projectId, userId]);

    if (status === 'loading') {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
                <div className="flex flex-col items-center text-white gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                    <p className="text-sm text-white/60 uppercase tracking-widest">Verifying session...</p>
                </div>
            </div>
        );
    }

    if (!projectId) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="p-8 text-center bg-white rounded-lg shadow-md border-l-4 border-red-500">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Missing Project ID</h2>
                    <p className="text-gray-600">Please provide a <code className="bg-gray-100 px-1 rounded">projectId</code> in the URL (e.g., <code className="bg-gray-100 px-1 rounded">?projectId=xyz</code>)</p>
                </div>
            </div>
        );
    }

    // BUG 1 FIX: Build a proper ViewableSlide object for ImageViewer, not a raw string
    const currentSlide: ViewableSlide | null = currentImage
        ? { slideNumber: 1, imagePath: currentImage.path }
        : null;

    return (
        <div className="flex h-screen bg-gray-900 overflow-hidden font-sans">
            {/* Left: Image Viewer Canvas */}
            <div className="flex-1 relative bg-black flex items-center justify-center">
                {loading && (
                    <div className="text-white text-lg animate-pulse flex items-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading next image...
                    </div>
                )}

                {!loading && error && (
                    <div className="text-white text-xl bg-gray-800 border border-gray-700 p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4">
                        <span className="text-4xl">🎉</span>
                        <p className="text-center">{error}</p>
                    </div>
                )}

                {/* BUG 1 FIX: Pass a properly-shaped ViewableSlide to ImageViewer */}
                {!loading && !error && currentSlide && (
                    <ImageViewer slide={currentSlide} />
                )}
            </div>

            {/* Right: Dynamic Annotation Panel */}
            <div className="w-[450px] min-w-[400px] flex-shrink-0 bg-white z-10 shadow-2xl border-l border-gray-200">
                {!loading && !error && currentImage && userId ? (
                    <AnnotationPanel
                        projectId={projectId}
                        imageId={currentImage._id}
                        userId={userId}
                        onAnnotationSaved={fetchNextImage}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center p-6 text-center text-gray-500 bg-gray-50">
                        <p>Waiting for active image...</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ViewerPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
                Loading Workspace...
            </div>
        }>
            <ViewerContent />
        </Suspense>
    );
}
