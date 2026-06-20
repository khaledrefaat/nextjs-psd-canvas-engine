'use client';

import { type PointerEvent, useEffect, useRef } from 'react';
import type { ImageArea } from '@/types/layer';
import { drawImageWithTransform } from '@/utils/renderer';

interface ImageTransformDialogProps {
  imageArea: ImageArea;
  onChange: (transform: ImageArea['transform']) => void;
  onClose: () => void;
}

/**
 * Modal for positioning an uploaded image inside its smart-object area. The
 * dialog canvas's internal resolution equals the layer canvas (the smart-object
 * area), so the preview uses the exact same draw math as the main render — and
 * the box edge is the clip boundary. Every change is applied live.
 */
export function ImageTransformDialog({
  imageArea,
  onChange,
  onClose,
}: ImageTransformDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerCanvas = imageArea.psdLayer.canvas;
  // Internal resolution = the smart-object area; CSS scales it down to fit. This
  // keeps the preview math identical to the main render.
  const areaW = layerCanvas?.width ?? 1;
  const areaH = layerCanvas?.height ?? 1;
  const { transform, currentImage } = imageArea;

  // Repaint the preview whenever the image or transform changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, areaW, areaH);
    drawImageWithTransform(ctx, currentImage, areaW, areaH, transform);
  }, [areaW, areaH, currentImage, transform]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Drag the image to pan. Convert screen px → area px via the displayed scale.
  const drag = useRef<{
    startX: number;
    startY: number;
    offX: number;
    offY: number;
  } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      offX: transform.offsetX,
      offY: transform.offsetY,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const start = drag.current;
    if (!canvas || !start) return;
    const scale = areaW / canvas.clientWidth;
    onChange({
      ...transform,
      offsetX: start.offX + (e.clientX - start.startX) * scale,
      offsetY: start.offY + (e.clientY - start.startY) * scale,
    });
  };

  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.releasePointerCapture(e.pointerId);
    drag.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Position ${imageArea.name}`}
        className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Position &ldquo;{imageArea.name}&rdquo;
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Done
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <canvas
            ref={canvasRef}
            width={areaW}
            height={areaH}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="max-h-[60vh] max-w-full cursor-move touch-none rounded-lg border border-dashed border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Drag the image to move it — anything outside the box is clipped.
          </p>

          <div className="mt-1 flex w-full items-center gap-4">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Zoom
            </span>
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.01}
              value={transform.scale}
              onChange={(e) =>
                onChange({ ...transform, scale: Number(e.target.value) })
              }
              className="flex-1 accent-zinc-900 dark:accent-zinc-100"
            />
            <span className="w-12 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
              {Math.round(transform.scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => onChange({ offsetX: 0, offsetY: 0, scale: 1 })}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
