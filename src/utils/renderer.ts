import type { Layer, Psd } from 'ag-psd';
import type { ColorLayer, ImageArea } from '@/types/layer';

/**
 * Rebuild a color layer's working canvas from its pristine snapshot. When a
 * color has been picked, it's filled with that color (masked to the original
 * shape); when no color is picked yet, the original pixels are restored as-is.
 * Safe to repeat on every recolor — the original pixels live in
 * `originalCanvas` and are never lost (survives StrictMode's double run).
 */
function applyColorLayer(cl: ColorLayer) {
  const sourceCanvas = cl.psdLayer.canvas;
  const original = cl.originalCanvas;
  if (!sourceCanvas || !original) return;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) return;

  // Always rebuild from the pristine snapshot so this stays idempotent. When no
  // color has been picked yet, restore the original pixels and stop there.
  sourceCtx.clearRect(0, 0, width, height);
  const color = cl.currentColor;
  if (color === null) {
    sourceCtx.drawImage(original, 0, 0);
    return;
  }

  // Composite the color on a temp canvas, masking against the pristine shape.
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  tempCtx.drawImage(original, 0, 0);
  tempCtx.fillStyle = color;
  tempCtx.fillRect(0, 0, width, height);
  tempCtx.globalCompositeOperation = 'source-in';
  tempCtx.fillRect(0, 0, width, height);
  tempCtx.globalCompositeOperation = 'source-over';

  sourceCtx.drawImage(tempCanvas, 0, 0);
}

interface Point {
  x: number;
  y: number;
}

/**
 * Solve the linear system M·x = b (n×n) via Gaussian elimination with partial
 * pivoting. Returns null if the system is singular. Mutates M and b in place.
 */
function solveLinearSystem(M: number[][], b: number[]): number[] | null {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    if (pivot !== col) {
      [M[col], M[pivot]] = [M[pivot], M[col]];
      [b[col], b[pivot]] = [b[pivot], b[col]];
    }
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col] / M[col][col];
      for (let k = col; k < n; k++) M[row][k] -= factor * M[col][k];
      b[row] -= factor * b[col];
    }
  }
  return b.map((value, i) => value / M[i][i]);
}

/**
 * Homography mapping the source rectangle (0,0)→(w,h) onto a destination quad
 * (top-left, top-right, bottom-right, bottom-left). Returns the 8 coefficients
 * [a,b,c,d,e,f,g,h] where a source point (x,y) lands at
 *   ((a·x + b·y + c) / (g·x + h·y + 1), (d·x + e·y + f) / (g·x + h·y + 1)).
 * This is the projective transform Photoshop records for a perspective-placed
 * smart object — a single affine can't represent it (the 4 corners aren't a
 * parallelogram), so we need the full homography.
 */
function computeHomography(
  w: number,
  h: number,
  tl: Point,
  tr: Point,
  br: Point,
  bl: Point,
): number[] | null {
  const src = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  const dst = [tl, tr, br, bl];
  const M: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    M.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    b.push(u);
    M.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    b.push(v);
  }
  return solveLinearSystem(M, b);
}

/** Apply a homography (from `computeHomography`) to a single point. */
function mapThroughHomography(H: number[], x: number, y: number): Point {
  const denom = H[6] * x + H[7] * y + 1;
  return {
    x: (H[0] * x + H[1] * y + H[2]) / denom,
    y: (H[3] * x + H[4] * y + H[5]) / denom,
  };
}

/** Grid resolution used to approximate a perspective quad with affine cells. */
const PERSPECTIVE_SUBDIVISIONS = 20;

/**
 * Draw `image` into a destination quad (`tl`, `tr`, `br`, `bl`, in the context's
 * own coordinate space), reproducing the smart object's perspective. The image
 * is placed into the source rectangle (`srcW`×`srcH`) at
 * `[offX, offY, fitW, fitH]` — a fill (fitW/fitH ≥ src) covers the whole quad
 * and crops the overflow; a fit (≤ src) centers and letterboxes — then mapped.
 *
 * Canvas 2D has no native perspective transform, so we subdivide the SOURCE
 * RECTANGLE into an N×N grid (not the image rect), map each cell's corners
 * through the homography, and draw each cell with its own affine transform
 * clipped to its quad. Subdividing the source rectangle is what keeps a fill
 * from spilling past the quad: every cell projects inside it, so the overflow
 * is cropped to the smart-object bounds exactly. At N≈20 each cell is small
 * enough that the piecewise-affine result is visually indistinguishable from
 * the true projective mapping.
 */
function drawImageInQuad(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  srcW: number,
  srcH: number,
  offX: number,
  offY: number,
  fitW: number,
  fitH: number,
  tl: Point,
  tr: Point,
  br: Point,
  bl: Point,
) {
  const H = computeHomography(srcW, srcH, tl, tr, br, bl);
  if (!H) return;

  const N = PERSPECTIVE_SUBDIVISIONS;
  const imgW = image.width;
  const imgH = image.height;

  // kx/ky convert source-rect units → image pixels (the image sits inside the
  // source rect at [offX, offY, fitW, fitH]).
  const kx = imgW / fitW;
  const ky = imgH / fitH;
  const cellSrcW = srcW / N;
  const cellSrcH = srcH / N;
  const cellImgW = cellSrcW * kx;
  const cellImgH = cellSrcH * ky;

  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      // Corners of this cell in source-rectangle space, and their projection.
      const sx0 = i * cellSrcW;
      const sx1 = sx0 + cellSrcW;
      const sy0 = j * cellSrcH;
      const sy1 = sy0 + cellSrcH;
      const d00 = mapThroughHomography(H, sx0, sy0);
      const d10 = mapThroughHomography(H, sx1, sy0);
      const d11 = mapThroughHomography(H, sx1, sy1);
      const d01 = mapThroughHomography(H, sx0, sy1);

      // Top-left of this cell in image-pixel space.
      const ux0 = (sx0 - offX) * kx;
      const uy0 = (sy0 - offY) * ky;

      // Affine map image-px → context-px. Treat the projected cell as a
      // parallelogram anchored at d00 with axes (d10−d00) and (d01−d00):
      //   ctx = d00 + ((px − ux0)/cellImgW)·(d10−d00) + ((py − uy0)/cellImgH)·(d01−d00)
      // setTransform(a, b, c, d, e, f): x' = a·x + c·y + e, y' = b·x + d·y + f.
      const a = (d10.x - d00.x) / cellImgW;
      const b = (d10.y - d00.y) / cellImgW;
      const c = (d01.x - d00.x) / cellImgH;
      const d = (d01.y - d00.y) / cellImgH;
      const e = d00.x - ux0 * a - uy0 * c;
      const f = d00.y - ux0 * b - uy0 * d;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(d00.x, d00.y);
      ctx.lineTo(d10.x, d10.y);
      ctx.lineTo(d11.x, d11.y);
      ctx.lineTo(d01.x, d01.y);
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(a, b, c, d, e, f);
      ctx.drawImage(image, 0, 0);
      ctx.restore();
    }
  }
}

/**
 * The smart object's placement as a destination quad plus the source rectangle
 * that maps onto it, all in the layer canvas's local coordinate space. Returns
 * null when the layer has no usable smart-object transform (e.g. a plain tagged
 * raster layer). Used internally by `getImagePlacement` / `drawImageArea`.
 */
export function getImageAreaQuad(ia: ImageArea): {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
  srcW: number;
  srcH: number;
} | null {
  const placed = ia.psdLayer.placedLayer;
  const docCorners = placed?.nonAffineTransform ?? placed?.transform;
  if (!placed || !docCorners || docCorners.length < 8) return null;

  const left = ia.psdLayer.left ?? 0;
  const top = ia.psdLayer.top ?? 0;
  const local = (i: number): Point => ({
    x: docCorners[i] - left,
    y: docCorners[i + 1] - top,
  });
  const tl = local(0);
  const tr = local(2);
  const br = local(4);
  const bl = local(6);
  // Source rectangle = the smart object's own content size. Fall back to the
  // quad's edge lengths when Photoshop didn't record it.
  const srcW = placed.width ?? Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const srcH = placed.height ?? Math.hypot(bl.x - tl.x, bl.y - tl.y);
  return { tl, tr, br, bl, srcW, srcH };
}

/**
 * Where the image sits inside its (un-projected) source box, after applying the
 * user's scale/pan. The box is the smart object's source rectangle, or — for a
 * layer with no perspective — the layer canvas itself. This flat, axis-aligned
 * space is what the transform dialog edits in; `drawImageArea` then projects it
 * through the quad for the real render. Because the quad is just this box after
 * projection, cropping at the box edges here is identical to cropping at the
 * quad edges on the canvas.
 */
export function getImagePlacement(ia: ImageArea): {
  boxW: number;
  boxH: number;
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  if (!ia.currentImage) return null;
  const img = ia.currentImage;
  const { scale, offsetX, offsetY } = ia.transform;

  const quad = getImageAreaQuad(ia);
  const boxW = quad?.srcW ?? ia.psdLayer.canvas?.width ?? 0;
  const boxH = quad?.srcH ?? ia.psdLayer.canvas?.height ?? 0;
  if (boxW <= 0 || boxH <= 0) return null;

  // Cover the box, then apply the user's zoom (scale) and pan (offsetX/Y).
  const ratio = Math.max(boxW / img.width, boxH / img.height);
  const w = img.width * ratio * scale;
  const h = img.height * ratio * scale;
  const x = boxW / 2 + offsetX - w / 2;
  const y = boxH / 2 + offsetY - h / 2;
  return { boxW, boxH, x, y, w, h };
}

/**
 * Draw an image area's current image (or its original placeholder) into `ctx`,
 * in the layer canvas's local coordinate space, applying the user's scale/pan
 * transform on top of the smart object's recorded perspective placement. Does
 * NOT clear or resize the target — the caller owns that. Used by the main render
 * (via applyImageArea); the transform dialog edits the flat placement instead.
 */
export function drawImageArea(ctx: CanvasRenderingContext2D, ia: ImageArea) {
  if (!ia.currentImage) {
    if (ia.originalCanvas) ctx.drawImage(ia.originalCanvas, 0, 0);
    return;
  }

  const placement = getImagePlacement(ia);
  if (!placement) return;

  const quad = getImageAreaQuad(ia);
  if (quad) {
    // Project the flat source-space placement through the perspective quad.
    drawImageInQuad(
      ctx,
      ia.currentImage,
      placement.boxW,
      placement.boxH,
      placement.x,
      placement.y,
      placement.w,
      placement.h,
      quad.tl,
      quad.tr,
      quad.br,
      quad.bl,
    );
    return;
  }

  // No usable smart-object transform (e.g. a plain tagged layer) → draw flat.
  ctx.drawImage(
    ia.currentImage,
    placement.x,
    placement.y,
    placement.w,
    placement.h,
  );
}

/**
 * Rebuild an image area's working canvas (the scratch buffer the renderer later
 * composites). Clears it, then delegates to `drawImageArea`. (The transform
 * dialog edits the flat placement via `getImagePlacement` instead, but both read
 * the same `transform`, so the render and the dialog can't drift.)
 */
function applyImageArea(ia: ImageArea) {
  const layerCanvas = ia.psdLayer.canvas;
  if (!layerCanvas) return;

  const layerCtx = layerCanvas.getContext('2d');
  if (!layerCtx) return;

  layerCtx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
  drawImageArea(layerCtx, ia);
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
  hiddenLayers: Set<string> = new Set(),
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
  //    A layer whose name is in `hiddenLayers` is skipped entirely — it isn't
  //    drawn and doesn't become a clip target, matching how layers without a
  //    canvas already behave. NOTE: this does not cascade to a hidden layer's
  //    clipped children; they keep masking against the prior clip target. That's
  //    fine for the common case (shadows/backgrounds are normal, non-clipped
  //    layers) and keeps the clipping invariant in drawLayer untouched.
  let clipTarget: Layer | null = null;
  for (const layer of children) {
    if (layer.name && hiddenLayers.has(layer.name)) continue;
    clipTarget = drawLayer(ctx, layer, clipTarget);
  }
}
