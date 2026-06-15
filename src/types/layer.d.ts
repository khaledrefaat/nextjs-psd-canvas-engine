import type { Layer, Psd } from 'ag-psd';

// A mockup always has a front, and maybe a back
export type Side = 'front' | 'back';

// What does a color layer look like to our UI?
export interface ColorLayer {
  id: string;
  name: string;
  psdLayer: Layer; // Keep reference to the actual PSD layer for rendering
  originalCanvas: HTMLCanvasElement | null; // Pristine snapshot so rendering stays non-destructive
  currentColor: string; // e.g., '#FF0000'
}

// What does an image placement area look like?
export interface ImageArea {
  id: string;
  name: string;
  psdLayer: Layer; // The smart object layer
  originalCanvas: HTMLCanvasElement | null; // Pristine snapshot so rendering stays non-destructive
  currentImage: HTMLImageElement | null; // The user's uploaded image
}

// The overall state of our editor
export interface MockupState {
  psd: Psd | null;
  colorLayers: ColorLayer[];
  imageAreas: ImageArea[];
}
