import type { Layer } from 'ag-psd';

// What does a color layer look like to our UI?
export interface ColorLayer {
  id: string;
  name: string;
  psdLayer: Layer; // Keep reference to the actual PSD layer for rendering
  originalCanvas: HTMLCanvasElement | null; // Pristine snapshot so rendering stays non-destructive
  currentColor: string | null; // null = untouched, using the original pixels
}

/**
 * User adjustments to a placed image, applied on top of the smart object's
 * recorded placement. `scale` multiplies the cover size (1 = fill the area);
 * `offsetX`/`offsetY` pan the image, measured in the smart object's source
 * rectangle (pre-projection) units.
 */
export interface ImageTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

// What does an image placement area look like?
export interface ImageArea {
  id: string;
  name: string;
  psdLayer: Layer; // The smart object layer
  originalCanvas: HTMLCanvasElement | null; // Pristine snapshot so rendering stays non-destructive
  currentImage: HTMLImageElement | null; // The user's uploaded image
  transform: ImageTransform; // Scale + pan set via the transform dialog
}
