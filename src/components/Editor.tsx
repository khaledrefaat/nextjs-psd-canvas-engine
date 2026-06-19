'use client';

import { type Psd, readPsd } from 'ag-psd';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Icon } from '@/components/ui/Icon';
import { UploadButton } from '@/components/ui/UploadButton';
import type { ColorLayer, ImageArea } from '@/types/layer';
import { extractEditableLayers } from '@/utils/mockupLayers';
import { renderMockup } from '@/utils/renderer';

export default function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [colorLayers, setColorLayers] = useState<ColorLayer[]>([]);
  const [imageAreas, setImageAreas] = useState<ImageArea[]>([]);
  const [psd, setPsd] = useState<Psd | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());

  // Whenever our layers change, re-render the canvas.
  useEffect(() => {
    if (psd && canvasRef.current) {
      renderMockup(
        canvasRef.current,
        psd,
        colorLayers,
        imageAreas,
        hiddenLayers,
      );
    }
  }, [psd, colorLayers, imageAreas, hiddenLayers]);

  // Load + parse a PSD file and split out the editable layers.
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    // Skip the composite so layers stay separate.
    const parsedPsd = readPsd(buffer);

    const { colorLayers: nextColors, imageAreas: nextImages } =
      extractEditableLayers(parsedPsd);

    setPsd(parsedPsd);
    setColorLayers(nextColors);
    setImageAreas(nextImages);
    // New file → fresh visibility, so stale hidden names don't carry over.
    setHiddenLayers(new Set());
  };

  const handleColorChange = (layerId: string, newColor: string) => {
    setColorLayers((prev) =>
      prev.map((l) =>
        l.id === layerId ? { ...l, currentColor: newColor } : l,
      ),
    );
  };

  // Show/hide a top-level layer by name. Always return a new Set so React
  // sees a changed reference and the render effect re-fires.
  const handleToggleLayer = (layerName: string) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerName)) {
        next.delete(layerName);
      } else {
        next.add(layerName);
      }
      return next;
    });
  };

  const handleImageUpload = (
    layerId: string,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      setImageAreas((prev) =>
        prev.map((l) => (l.id === layerId ? { ...l, currentImage: img } : l)),
      );
      // The image is now decoded into `img`, so the blob URL is safe to free.
      URL.revokeObjectURL(url);
    };
    // Free the URL too if the image fails to decode, so it can't leak.
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const layerNames = (psd?.children ?? [])
    .map((child) => child.name ?? 'Layer')
    .filter((name) => !name.includes('mm_'));

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          PSD Mockup Editor
        </h1>
        <UploadButton
          className="ml-auto"
          variant="solid"
          icon="upload"
          label="Upload PSD"
          accept=".psd"
          onChange={handleFileUpload}
        />
      </header>

      {/* Main area: sidebar + canvas */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — controls */}
        {psd ? (
          <Sidebar
            layerNames={layerNames}
            hiddenLayers={hiddenLayers}
            colorLayers={colorLayers}
            imageAreas={imageAreas}
            onToggleLayer={handleToggleLayer}
            onColorChange={handleColorChange}
            onImageUpload={handleImageUpload}
          />
        ) : null}

        {/* Canvas area */}
        <main className="flex-1 flex items-center justify-center p-8 overflow-auto">
          {!psd ? (
            <div className="flex flex-col items-center gap-4 text-zinc-400 dark:text-zinc-600">
              <Icon name="image" className="h-24 w-24" strokeWidth={1} />
              <p className="text-lg">Upload a PSD file to get started</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full rounded-xl shadow-2xl"
            />
          )}
        </main>
      </div>
    </div>
  );
}
