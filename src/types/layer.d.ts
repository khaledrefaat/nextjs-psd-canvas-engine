import type { Layer, Psd } from 'ag-psd';

// What does a color layer look like to our UI?
export interface ColorLayer {
  id: string;
  name: string;
  psdLayer: Layer; // Keep reference to the actual PSD layer for rendering
  originalCanvas: HTMLCanvasElement | null; // Pristine snapshot so rendering stays non-destructive
  currentColor: string | null; // null = untouched, using the original pixels
}

// What does an image placement area look like?
export interface ImageArea {
  id: string;
  name: string;
  psdLayer: Layer; // The smart object layer
  originalCanvas: HTMLCanvasElement | null; // Pristine snapshot so rendering stays non-destructive
  currentImage: HTMLImageElement | null; // The user's uploaded image
}
