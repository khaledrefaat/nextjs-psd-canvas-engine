import type { ChangeEvent } from 'react';
import { UploadButton } from '@/components/ui/UploadButton';
import type { ImageArea } from '@/types/layer';

interface ImageAreaControlProps {
  layer: ImageArea;
  onImageUpload: (layerId: string, e: ChangeEvent<HTMLInputElement>) => void;
  onOpenTransform: (layerId: string) => void;
}

export function ImageAreaControl({
  layer,
  onImageUpload,
  onOpenTransform,
}: ImageAreaControlProps) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {layer.name}
      </span>
      <UploadButton
        variant="dashed"
        icon="image"
        accept="image/*"
        label={layer.currentImage ? 'Change Image' : 'Choose Image'}
        onChange={(e) => onImageUpload(layer.id, e)}
      />
      {layer.currentImage ? (
        <button
          type="button"
          onClick={() => onOpenTransform(layer.id)}
          className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Adjust position &amp; size
        </button>
      ) : null}
    </div>
  );
}
