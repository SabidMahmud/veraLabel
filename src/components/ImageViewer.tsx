'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { decode, type TiffIfd } from 'tiff';
import { ViewableSlide } from '@/types/types';
import {
  ZoomIn,
  ZoomOut,
  Home,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface ImageViewerProps {
  slide: ViewableSlide;
  onNext?: () => void;
  onPrev?: () => void;
  canNext?: boolean;
  canPrev?: boolean;
}

const SUPPORTED_MAX_COMPONENTS = 4;

function convertToImageData(frame: TiffIfd, ctx: CanvasRenderingContext2D) {
  const { width, height, data } = frame;
  const components = frame.samplesPerPixel ?? frame.components ?? 1;
  const bitsPerSample = frame.bitsPerSample ?? 8;
  const palette = frame.palette;

  if (components > SUPPORTED_MAX_COMPONENTS && !palette) {
    throw new Error(
      `TIFF has ${components} samples per pixel; only up to ${SUPPORTED_MAX_COMPONENTS} are supported.`,
    );
  }

  if (bitsPerSample === 1) {
    throw new Error('1-bit TIFF images are not supported by the client decoder.');
  }

  const imageData = ctx.createImageData(width, height);
  const target = imageData.data;

  const toByte = (value: number) => {
    if (bitsPerSample === 8) {
      return value;
    }
    if (bitsPerSample === 16) {
      return Math.round(value / 257);
    }
    if (
      (bitsPerSample === 32 && data instanceof Float32Array) ||
      (bitsPerSample === 64 && data instanceof Float64Array)
    ) {
      const clamped = Math.max(0, Math.min(1, value));
      return Math.round(clamped * 255);
    }
    throw new Error(`Unsupported bit depth (${bitsPerSample}) for TIFF decoding.`);
  };

  const totalPixels = width * height;

  if (palette && palette.length) {
    const paletteBytes = palette.map(([r, g, b]) => [
      Math.round(r / 257),
      Math.round(g / 257),
      Math.round(b / 257),
    ]);
    for (let i = 0; i < totalPixels; i += 1) {
      const destIndex = i * 4;
      const idx = (data as Uint8Array)[i];
      const entry = paletteBytes[idx];
      if (!entry) {
        target[destIndex] = 0;
        target[destIndex + 1] = 0;
        target[destIndex + 2] = 0;
        target[destIndex + 3] = 255;
        continue;
      }
      target[destIndex] = entry[0];
      target[destIndex + 1] = entry[1];
      target[destIndex + 2] = entry[2];
      target[destIndex + 3] = 255;
    }
    return imageData;
  }

  if (components === 1) {
    for (let i = 0; i < totalPixels; i += 1) {
      const destIndex = i * 4;
      const value = toByte(data[i]);
      target[destIndex] = value;
      target[destIndex + 1] = value;
      target[destIndex + 2] = value;
      target[destIndex + 3] = 255;
    }
    return imageData;
  }

  if (components === 2) {
    for (let i = 0; i < totalPixels; i += 1) {
      const srcIndex = i * 2;
      const destIndex = i * 4;
      const value = toByte(data[srcIndex]);
      target[destIndex] = value;
      target[destIndex + 1] = value;
      target[destIndex + 2] = value;
      target[destIndex + 3] = toByte(data[srcIndex + 1]);
    }
    return imageData;
  }

  for (let i = 0; i < totalPixels; i += 1) {
    const srcIndex = i * components;
    const destIndex = i * 4;
    target[destIndex] = toByte(data[srcIndex]);
    target[destIndex + 1] = toByte(data[srcIndex + 1]);
    target[destIndex + 2] = toByte(data[srcIndex + 2]);
    target[destIndex + 3] =
      components >= 4 || frame.alpha ? toByte(data[srcIndex + components - 1]) : 255;
  }

  return imageData;
}

export default function ImageViewer({
  slide,
  onNext,
  onPrev,
  canNext = false,
  canPrev = false,
}: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState<string | null>(null);
  const [isTiff, setIsTiff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bitmapSrc, setBitmapSrc] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset zoom and position when slide changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setImageError(null);
    setIsTiff(false);
    setBitmapSrc(null);
  }, [slide.slideNumber]);

  useEffect(
    () => () => {
      if (bitmapSrc) {
        URL.revokeObjectURL(bitmapSrc);
      }
    },
    [bitmapSrc],
  );

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const driveIdFromPath = (url?: string) => {
    if (!url) return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    return match ? match[1] : '';
  };

  const imageUrl = useMemo(() => {
    // Priority 1: Use the direct imagePath from CSV (served by Nginx/static)
    if (slide.imagePath) {
      return slide.imagePath;
    }
    // Priority 2: Fallback to derivedImagePath (legacy)
    if (slide.derivedImagePath) {
      return slide.derivedImagePath;
    }
    // Priority 3: Fallback to Google Drive API (legacy)
    const fileId = slide.fileId || driveIdFromPath(slide.imagePath);
    if (fileId) return `/api/drive-image/${encodeURIComponent(fileId)}`;
    return '';
  }, [slide]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.2 : -0.2;
    setZoom((prev) => {
      const next = Math.min(Math.max(prev + delta, 0.5), 5);
      return Number(next.toFixed(2));
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetView();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    if (!imageUrl) {
      setImageError('This slide does not have an image reference.');
      setIsTiff(false);
      setBitmapSrc(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadImage = async () => {
      setLoading(true);
      setImageError(null);
      setIsTiff(false);
      setBitmapSrc(null);

      try {
        let effectiveUrl = imageUrl;
        const primaryFileId = slide.fileId || driveIdFromPath(slide.imagePath);
        let response = await fetch(effectiveUrl, {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 404 && primaryFileId) {
            const fallbackUrl = `/api/drive-image/${encodeURIComponent(primaryFileId)}`;
            const fallbackResponse = await fetch(fallbackUrl, {
              signal: controller.signal,
              cache: 'no-store',
            });
            if (!fallbackResponse.ok) {
              throw new Error(
                `Failed to load image (status ${fallbackResponse.status}).`
              );
            }
            response = fallbackResponse;
            effectiveUrl = fallbackUrl;
          } else {
            throw new Error(`Failed to load image (status ${response.status}).`);
          }
        }

        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
        const headerView = new DataView(buffer.slice(0, 4));
        const byteOrder = headerView.getUint16(0, false);
        const hasTiffMagic = byteOrder === 0x4949 || byteOrder === 0x4d4d;
        const likelyTiff =
          hasTiffMagic ||
          contentType.includes('image/tiff') ||
          contentType.includes('image/tif') ||
          /\.tiff?(?:$|\?)/i.test(slide.imagePath || '') ||
          /\.tiff?(?:$|\?)/i.test(slide.derivedImagePath || '') ||
          /\.tiff?(?:$|\?)/i.test(effectiveUrl);

        let rendered = false;

        if (likelyTiff) {
          try {
            const frames = decode(new Uint8Array(buffer));
            if (!frames.length) {
              throw new Error('TIFF file does not contain a readable frame.');
            }
            const canvas = canvasRef.current;
            if (!canvas) {
              throw new Error('Canvas is not ready.');
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Unable to acquire 2D canvas context.');
            }
            const imageData = convertToImageData(frames[0], ctx);
            canvas.width = frames[0].width;
            canvas.height = frames[0].height;
            ctx.putImageData(imageData, 0, 0);
            rendered = true;
            setIsTiff(true);
            setImageError(null);
          } catch (decodeError) {
            const message =
              decodeError instanceof Error ? decodeError.message : 'Unknown error while decoding TIFF.';
            throw new Error(`Unable to decode TIFF: ${message}`);
          }
        }

        if (!rendered) {
          const blob = new Blob([buffer], {
            type: contentType || 'application/octet-stream',
          });
          const objectUrl = URL.createObjectURL(blob);
          setBitmapSrc(objectUrl);
          setIsTiff(false);
          setImageError(null);
        }
      } catch (error) {
        if (cancelled) return;
        setIsTiff(false);
        setBitmapSrc(null);
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        const message = error instanceof Error ? error.message : 'Unknown error while loading image.';
        setImageError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadImage();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [imageUrl, slide.imagePath, slide.derivedImagePath]);

  const transformStyle = {
    transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
    transition: isDragging ? 'none' : 'transform 0.12s ease-out',
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-900">
      {/* Top Left Controls */}
      <div className="absolute left-4 top-4 flex space-x-2 rounded-md bg-white/70 backdrop-blur shadow-sm border border-slate-200 p-1 z-10">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="rounded p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 text-slate-700 transition-colors"
          title="Previous Slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="w-px bg-slate-200 my-1" />
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="rounded p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 text-slate-700 transition-colors"
          title="Next Slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Top Right Controls */}
      <div className="absolute right-4 top-4 flex flex-col space-y-2 z-10">
        <div className="flex flex-col rounded-md bg-white/70 backdrop-blur shadow-sm border border-slate-200 p-1 space-y-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="rounded p-1.5 hover:bg-slate-100 text-slate-700 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="rounded p-1.5 hover:bg-slate-100 text-slate-700 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <div className="h-px bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={handleResetView}
            className="rounded p-1.5 hover:bg-slate-100 text-slate-700 transition-colors"
            title="Reset View"
          >
            <Home className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="flex h-full w-full items-center justify-center cursor-move active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {loading && (
          <div className="absolute z-20 flex items-center space-x-2 rounded-full bg-slate-900/80 backdrop-blur px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
            <span>Loading Image...</span>
          </div>
        )}

        {imageUrl && !imageError ? (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              className="max-h-full max-w-full select-none"
              style={{
                ...transformStyle,
                display: isTiff ? 'block' : 'none',
              }}
            />
            <img
              src={bitmapSrc || imageUrl}
              alt={`Slide ${slide.slideNumber}`}
              className="max-h-full max-w-full select-none"
              style={{
                ...transformStyle,
                display: isTiff ? 'none' : 'block',
              }}
              draggable={false}
              onError={() =>
                setImageError('Unable to load this slide.')
              }
            />
            {/* Minimal Instructions (only shows on empty/loading state or very subtle) */}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 rounded-lg border border-dashed border-slate-700 bg-slate-800/50 px-8 py-10 text-center text-slate-400">
            <ImageOff className="h-10 w-10 opacity-50" />
            <p className="text-sm font-medium">Image unavailable</p>
            <p className="text-xs opacity-70">
              {imageError ?? 'No image reference found.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
