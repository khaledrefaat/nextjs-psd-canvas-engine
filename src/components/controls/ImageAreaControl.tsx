import type { ChangeEvent } from 'react';
import { UploadButton } from '@/components/ui/UploadButton';
import type { ImageArea } from '@/types/layer';

interface ImageAreaControlProps {
  layer: ImageArea;
  onImageUpload: (layerId: string, e: ChangeEvent<HTMLInputElement>) => void;
}

export function ImageAreaControl({
  layer,
  onImageUpload,
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
    </div>
  );
}
