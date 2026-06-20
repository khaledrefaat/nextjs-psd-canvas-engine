'use client';

import { type Psd, readPsd } from 'ag-psd';
import NextImage from 'next/image';
import Link from 'next/link';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ImageTransformDialog } from '@/components/controls/ImageTransformDialog';
import { Sidebar } from '@/components/Sidebar';
import { Icon } from '@/components/ui/Icon';
import { UploadButton } from '@/components/ui/UploadButton';
import { EXAMPLES, type Example } from '@/data/examples';
import type { ColorLayer, ImageArea, ImageTransform } from '@/types/layer';
import { extractEditableLayers } from '@/utils/mockupLayers';
import { renderMockup } from '@/utils/renderer';

export default function Editor({
  initialExample,
}: {
  initialExample?: Example;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [colorLayers, setColorLayers] = useState<ColorLayer[]>([]);
  const [imageAreas, setImageAreas] = useState<ImageArea[]>([]);
  const [psd, setPsd] = useState<Psd | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  // id of the image area whose transform dialog is open (null = closed).
  const [transformLayerId, setTransformLayerId] = useState<string | null>(null);
  // Mobile sidebar drawer open state (ignored on desktop, where it's inline).
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Loading state while fetching/parsing an example from /examples/[slug].
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  // Parse a PSD buffer into editable layers and load it into the editor. Shared
  // by the file picker and the example auto-load below. Memoized so it's stable
  // enough to be an effect dependency (it only calls stable setState setters).
  const loadPsdBuffer = useCallback((buffer: ArrayBuffer) => {
    const parsedPsd = readPsd(buffer);
    const { colorLayers: nextColors, imageAreas: nextImages } =
      extractEditableLayers(parsedPsd);

    setPsd(parsedPsd);
    setColorLayers(nextColors);
    setImageAreas(nextImages);
    // New file → fresh visibility, so stale hidden names don't carry over.
    setHiddenLayers(new Set());
  }, []);

  // Load + parse a PSD chosen via the file picker.
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadPsdBuffer(await file.arrayBuffer());
  };

  // Auto-load the example passed via the /examples/[slug] route. The PSD is
  // fetched from /public and parsed client-side (browser-native canvas).
  useEffect(() => {
    if (!initialExample) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetch(initialExample.file)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Could not load file (HTTP ${res.status})`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (!cancelled) loadPsdBuffer(buffer);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Failed to load example',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialExample, loadPsdBuffer]);

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
          <Link href="/" className="hover:opacity-80">
            PSD Mockup Editor
          </Link>
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
            loading ? (
              <div className="flex flex-col items-center gap-3 text-zinc-400 dark:text-zinc-600">
                <Icon
                  name="image"
                  className="h-12 w-12 animate-pulse"
                  strokeWidth={1.5}
                />
                <p className="text-sm">Loading example…</p>
              </div>
            ) : (
              <div className="flex w-full max-w-3xl flex-col items-center gap-8">
                <div className="flex flex-col items-center gap-3 text-center text-zinc-400 dark:text-zinc-600">
                  <Icon name="image" className="h-20 w-20" strokeWidth={1} />
                  <p className="text-lg">Upload a PSD or try an example</p>
                </div>
                {loadError ? (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {loadError}
                  </p>
                ) : null}
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
                  {EXAMPLES.map((example) => (
                    <Link
                      key={example.slug}
                      href={`/examples/${example.slug}`}
                      className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <NextImage
                          src={example.img}
                          alt={example.title}
                          fill
                          loading="eager"
                          sizes="(max-width: 640px) 90vw, 30vw"
                          className="object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      </div>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {example.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )
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
