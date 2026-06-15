import type { ColorLayer } from '@/types/layer';

interface ColorLayerControlProps {
  layer: ColorLayer;
  onColorChange: (layerId: string, newColor: string) => void;
}

export function ColorLayerControl({
  layer,
  onColorChange,
}: ColorLayerControlProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={`color-${layer.id}`}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {layer.name}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          id={`color-${layer.id}`}
          value={layer.currentColor}
          onChange={(e) => onColorChange(layer.id, e.target.value)}
          className="h-12 w-12 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer bg-transparent p-1"
        />
        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
          {layer.currentColor}
        </span>
      </div>
    </div>
  );
}
