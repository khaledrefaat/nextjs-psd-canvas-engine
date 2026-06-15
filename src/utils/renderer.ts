import type { Layer, Psd } from 'ag-psd';
import type { ColorLayer, ImageArea } from '@/types/layer';

/**
 * Rebuild a color layer's working canvas from its pristine snapshot, filled
 * with the current color. Safe to repeat on every recolor — the original pixels
 * live in `originalCanvas` and are never lost (survives StrictMode's double run).
 */
function applyColorLayer(cl: ColorLayer) {
  const sourceCanvas = cl.psdLayer.canvas;
  const original = cl.originalCanvas;
  if (!sourceCanvas || !original) return;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Composite the color on a temp canvas, masking against the pristine shape.
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  tempCtx.drawImage(original, 0, 0);
  tempCtx.fillStyle = cl.currentColor;
  tempCtx.fillRect(0, 0, width, height);
  tempCtx.globalCompositeOperation = 'source-in';
  tempCtx.fillRect(0, 0, width, height);
  tempCtx.globalCompositeOperation = 'source-over';

  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) return;
  sourceCtx.clearRect(0, 0, width, height);
  sourceCtx.drawImage(tempCanvas, 0, 0);
}

/**
 * Rebuild an image area's working canvas: the user's image (fit + centered) if
 * one has been uploaded, otherwise the original placeholder from the snapshot.
 */
function applyImageArea(ia: ImageArea) {
  const layerCanvas = ia.psdLayer.canvas;
  if (!layerCanvas) return;

  const layerCtx = layerCanvas.getContext('2d');
  if (!layerCtx) return;

  layerCtx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);

  if (ia.currentImage) {
    const ratio = Math.min(
      layerCanvas.width / ia.currentImage.width,
      layerCanvas.height / ia.currentImage.height,
    );
    const width = ia.currentImage.width * ratio;
    const height = ia.currentImage.height * ratio;
    const x = (layerCanvas.width - width) / 2;
    const y = (layerCanvas.height - height) / 2;

    layerCtx.drawImage(ia.currentImage, x, y, width, height);
  } else if (ia.originalCanvas) {
    layerCtx.drawImage(ia.originalCanvas, 0, 0);
  }
}

/**
 * Draw a single PSD layer onto the main context, handling clipping masks.
 * Returns the layer subsequent clipped layers should mask against (a clipped
 * layer masks against the same target as its predecessor, never itself).
 */
function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  clipTarget: Layer | null,
): Layer | null {
  if (!layer.canvas) return clipTarget;

  const layerCanvas = layer.canvas;

  if (layer.clipping && clipTarget?.canvas) {
    const clipCanvas = clipTarget.canvas;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layerCanvas.width;
    tempCanvas.height = layerCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return clipTarget;

    // Draw the base shape (the cookie cutter)...
    tempCtx.drawImage(
      clipCanvas,
      (clipTarget.left ?? 0) - (layer.left ?? 0),
      (clipTarget.top ?? 0) - (layer.top ?? 0),
    );
    // ...then keep this layer only where it overlaps the base shape.
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.drawImage(layerCanvas, 0, 0);
    tempCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(tempCanvas, layer.left || 0, layer.top || 0);
    return clipTarget;
  }

  // Normal layer — draw it directly; it becomes the next clip target.
  ctx.drawImage(layerCanvas, layer.left || 0, layer.top || 0);
  return layer;
}

/**
 * Draws the mockup onto a given HTML Canvas.
 */
export function renderMockup(
  canvas: HTMLCanvasElement,
  psd: Psd,
  colorLayers: ColorLayer[],
  imageAreas: ImageArea[],
) {
  const ctx = canvas.getContext('2d');
  const children = psd.children;
  if (!ctx || !children) return;

  // 1. Size the canvas to the PSD and clear it.
  canvas.width = psd.width;
  canvas.height = psd.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Apply user edits to each editable layer's working canvas.
  colorLayers.forEach(applyColorLayer);
  imageAreas.forEach(applyImageArea);

  // 3. Composite every layer onto the main canvas (clipping masks included).
  let clipTarget: Layer | null = null;
  for (const layer of children) {
    clipTarget = drawLayer(ctx, layer, clipTarget);
  }
}
