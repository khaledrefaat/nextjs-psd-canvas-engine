'use client';

import { type Psd, readPsd } from 'ag-psd';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { ImageTransformDialog } from '@/components/controls/ImageTransformDialog';
import { Sidebar } from '@/components/Sidebar';
import { Icon } from '@/components/ui/Icon';
import { UploadButton } from '@/components/ui/UploadButton';
import type { ColorLayer, ImageArea, ImageTransform } from '@/types/layer';
import { extractEditableLayers } from '@/utils/mockupLayers';
import { renderMockup } from '@/utils/renderer';

export default function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [colorLayers, setColorLayers] = useState<ColorLayer[]>([]);
  const [imageAreas, setImageAreas] = useState<ImageArea[]>([]);
  const [psd, setPsd] = useState<Psd | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  // id of the image area whose transform dialog is open (null = closed).
  const [transformLayerId, setTransformLayerId] = useState<string | null>(null);
  // Mobile sidebar drawer open state (ignored on desktop, where it's inline).
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Update an image area's scale/pan from the transform dialog.
  const handleTransformChange = (
    layerId: string,
    transform: ImageTransform,
  ) => {
    setImageAreas((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, transform } : l)),
    );
  };

  // Export the rendered canvas as a PNG. The canvas only ever holds
  // locally-sourced pixels (PSD parsed from an ArrayBuffer, user images from
  // blob URLs), so it isn't cross-origin tainted and toBlob works.
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mockup.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const layerNames = (psd?.children ?? [])
    .map((child) => child.name ?? 'Layer')
    .filter((name) => !name.includes('mm_'));

  // The image area whose transform dialog is currently open, if any.
  const transformLayer =
    imageAreas.find((l) => l.id === transformLayerId) ?? null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        {psd ? (
          <button
            type="button"
            aria-label="Show adjustments"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
        ) : null}
        <h1 className="hidden sm:block text-xl font-semibold text-zinc-900 dark:text-zinc-100">
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
        {psd ? (
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:px-5 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Icon name="download" className="h-5 w-5" />
            <span className="hidden sm:inline">Download</span>
          </button>
        ) : null}
      </header>

      {/* Main area: sidebar + canvas */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — controls (inline on desktop, slide-in drawer on mobile) */}
        {psd ? (
          <Sidebar
            layerNames={layerNames}
            hiddenLayers={hiddenLayers}
            colorLayers={colorLayers}
            imageAreas={imageAreas}
            onToggleLayer={handleToggleLayer}
            onColorChange={handleColorChange}
            onImageUpload={handleImageUpload}
            onOpenTransform={(id) => {
              setTransformLayerId(id);
              setSidebarOpen(false);
            }}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        ) : null}

        {/* Backdrop behind the mobile drawer. */}
        {sidebarOpen && psd ? (
          <div
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
          />
        ) : null}

        {/* Canvas area */}
        <main className="flex-1 flex items-center justify-center p-4 overflow-auto md:p-8">
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

      {transformLayer ? (
        <ImageTransformDialog
          imageArea={transformLayer}
          onChange={(transform) =>
            handleTransformChange(transformLayer.id, transform)
          }
          onClose={() => setTransformLayerId(null)}
        />
      ) : null}
    </div>
  );
}
