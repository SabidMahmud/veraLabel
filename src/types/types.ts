/**
 * ViewableSlide — the minimum shape ImageViewer needs to render.
 * Both Image (from the VeraLabel queue API) and any future slide type
 * must satisfy this interface.
 */
export interface ViewableSlide {
    slideNumber: number;
    imagePath: string;
    derivedImagePath?: string;
    fileId?: string;
    magnification?: string;
}

/**
 * Generic slide filters used by the annotation workspace UI.
 * Status values are dynamic — driven by project configuration at runtime.
 */
export interface SlideFilters {
    search: string;
    status: 'all' | 'pending' | 'annotating' | 'conflict' | 'completed';
    projectId?: string;
}
