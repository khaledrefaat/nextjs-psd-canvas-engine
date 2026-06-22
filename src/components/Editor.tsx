'use client';

import { type Psd, readPsd } from 'ag-psd';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppHeader } from '@/components/AppHeader';
import { ImageTransformDialog } from '@/components/controls/ImageTransformDialog';
import { EmptyState } from '@/components/EmptyState';
import { Sidebar } from '@/components/Sidebar';
import { Icon } from '@/components/ui/Icon';
import type { Example } from '@/data/examples';
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
  // Init true when an example is expected so the first paint shows the spinner
  // instead of flashing the examples grid before the load effect kicks in.
  const [loading, setLoading] = useState(() => Boolean(initialExample));
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
  // by the file picker and the example auto-load below. Memoized so it stays
  // referentially stable as the effect dependency below (it only closes over
  // stable setState setters).
  const loadPsdBuffer = useCallback((buffer: ArrayBuffer) => {
    const parsedPsd = readPsd(buffer);
    const { colorLayers: nextColors, imageAreas: nextImages } =
      extractEditableLayers(parsedPsd);

    setPsd(parsedPsd);
    setColorLayers(nextColors);
    setImageAreas(nextImages);
    // New file → fresh visibility, so stale hidden names don't carry over.
    setHiddenLayers(new Set());
    // A successful load clears any error from a previous failed attempt.
    setLoadError(null);
  }, []);

  // Load + parse a PSD chosen via the file picker.
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    try {
      loadPsdBuffer(await file.arrayBuffer());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load PSD');
    }
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

  // Immutably patch one image area by id, leaving the rest untouched.
  const patchImageArea = (id: string, patch: Partial<ImageArea>) =>
    setImageAreas((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );

  const handleImageUpload = (
    layerId: string,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      patchImageArea(layerId, { currentImage: img });
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
    patchImageArea(layerId, { transform });
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
      <AppHeader
        hasDocument={Boolean(psd)}
        onUpload={handleFileUpload}
        onDownload={handleDownload}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {/* Surface load errors (bad upload, failed example fetch) regardless of
          whether a document is already open. Auto-clears on the next load. */}
      {loadError ? (
        <div
          role="alert"
          className="flex shrink-0 items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <span className="flex-1">{loadError}</span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setLoadError(null)}
            className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      ) : null}

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
            <EmptyState loading={loading} />
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
