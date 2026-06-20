'use client';

import { type PointerEvent, useEffect, useRef } from 'react';
import type { ImageArea, ImageTransform } from '@/types/layer';
import { getImagePlacement } from '@/utils/renderer';

interface ImageTransformDialogProps {
  imageArea: ImageArea;
  onChange: (transform: ImageTransform) => void;
  onClose: () => void;
}

/**
 * Modal for resizing / repositioning a placed image. The preview shows the image
 * in its flat, un-projected source box — a normal rectangle you edit in, the way
 * you'd edit a smart object's source — NOT the perspective-warped view. The box
 * edge is the crop boundary: anything dragged outside it is clipped, exactly as
 * it is on the real canvas (the perspective quad is just this box after
 * projection, so cropping here is identical to cropping there). Drag to pan;
 * slider to zoom.
 */
export function ImageTransformDialog({
  imageArea,
  onChange,
  onClose,
}: ImageTransformDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { transform, currentImage } = imageArea;

  // The flat editing box (smart object source rectangle, or the layer canvas).
  const placement = currentImage ? getImagePlacement(imageArea) : null;
  const boxW = placement?.boxW ?? 1;
  const boxH = placement?.boxH ?? 1;

  // Repaint the flat preview whenever the image or transform changes. The canvas
  // is sized to the box, so the browser clips the image to the box edge for us.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !currentImage || !placement) return;
    ctx.clearRect(0, 0, boxW, boxH);
    ctx.drawImage(
      currentImage,
      placement.x,
      placement.y,
      placement.w,
      placement.h,
    );
  }, [boxW, boxH, currentImage, placement]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Drag the image to pan. Store the gesture origin + the offset at press time,
  // then accumulate from there to avoid drift. 1:1 in box pixels — no projection
  // to undo, since the preview is the flat box.
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
    if (!canvas || !start || canvas.clientWidth === 0) return;
    const displayScale = boxW / canvas.clientWidth; // displayed px → box px
    onChange({
      ...transform,
      offsetX: start.offX + (e.clientX - start.startX) * displayScale,
      offsetY: start.offY + (e.clientY - start.startY) * displayScale,
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
        aria-label={`Adjust ${imageArea.name}`}
        className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Adjust &ldquo;{imageArea.name}&rdquo;
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
            width={boxW}
            height={boxH}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="max-h-[60vh] max-w-full cursor-move touch-none rounded-lg border border-dashed border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Drag the image to move it — the box is the crop boundary.
          </p>

          <div className="mt-1 flex w-full items-center gap-4">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Zoom
            </span>
            <input
              type="range"
              min={0.1}
              max={5}
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
              onClick={() => onChange({ scale: 1, offsetX: 0, offsetY: 0 })}
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
