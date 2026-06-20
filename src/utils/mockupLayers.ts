import type { Psd } from 'ag-psd';
import type { ColorLayer, ImageArea } from '@/types/layer';

/**
 * The layer-name convention that powers the editor. Designers tag PSD layers
 * with these prefixes to mark them as editable.
 *
 * NOTE: `mm_wrp:` and `mm_img:` are both treated as plain image slots today —
 * the wrap/fit distinction isn't used yet.
 */
export const LAYER_PREFIX = {
  color: 'mm_clr:',
  imageWrap: 'mm_wrp:',
  image: 'mm_img:',
} as const;

/**
 * Strip the editable-layer prefix (if any) from a layer name, for display.
 * Layers with no prefix are returned unchanged.
 */
export function cleanLayerName(name: string): string {
  return name
    .replace(LAYER_PREFIX.color, '')
    .replace(LAYER_PREFIX.imageWrap, '')
    .replace(LAYER_PREFIX.image, '');
}

/**
 * Snapshot a layer's canvas once at parse time. The renderer recolors /
 * re-images against this pristine copy, so the original pixels are never lost.
 */
function snapshotCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const copy = document.createElement('canvas');
  copy.width = source.width;
  copy.height = source.height;
  copy.getContext('2d')?.drawImage(source, 0, 0);
  return copy;
}

/**
 * Walk the PSD's top-level layers and split out the editable ones, snapshotting
 * each one's original canvas so rendering can stay non-destructive.
 */
export function extractEditableLayers(psd: Psd): {
  colorLayers: ColorLayer[];
  imageAreas: ImageArea[];
} {
  const colorLayers: ColorLayer[] = [];
  const imageAreas: ImageArea[] = [];

  psd.children?.forEach((layer) => {
    if (layer.name?.startsWith(LAYER_PREFIX.color)) {
      colorLayers.push({
        id: layer.name,
        name: cleanLayerName(layer.name),
        psdLayer: layer,
        originalCanvas: layer.canvas ? snapshotCanvas(layer.canvas) : null,
        currentColor: null, // Untouched — keep the original pixels until a color is picked
      });
    }
    if (
      layer.name?.startsWith(LAYER_PREFIX.imageWrap) ||
      layer.name?.startsWith(LAYER_PREFIX.image)
    ) {
      imageAreas.push({
        id: layer.name,
        name: cleanLayerName(layer.name),
        psdLayer: layer,
        originalCanvas: layer.canvas ? snapshotCanvas(layer.canvas) : null,
        currentImage: null,
        transform: { scale: 1, offsetX: 0, offsetY: 0 }, // Reset per new file
      });
    }
  });

  return { colorLayers, imageAreas };
}
