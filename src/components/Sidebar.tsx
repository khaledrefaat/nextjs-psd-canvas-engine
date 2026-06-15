import type { ChangeEvent } from 'react';
import { ColorLayerControl } from '@/components/controls/ColorLayerControl';
import { ImageAreaControl } from '@/components/controls/ImageAreaControl';
import { PanelSection } from '@/components/ui/PanelSection';
import type { ColorLayer, ImageArea } from '@/types/layer';

interface SidebarProps {
  colorLayers: ColorLayer[];
  imageAreas: ImageArea[];
  onColorChange: (layerId: string, newColor: string) => void;
  onImageUpload: (layerId: string, e: ChangeEvent<HTMLInputElement>) => void;
}

export function Sidebar({
  colorLayers,
  imageAreas,
  onColorChange,
  onImageUpload,
}: SidebarProps) {
  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-8">
      {colorLayers.length > 0 ? (
        <PanelSection title="Colors">
          {colorLayers.map((layer) => (
            <ColorLayerControl
              key={layer.id}
              layer={layer}
              onColorChange={onColorChange}
            />
          ))}
        </PanelSection>
      ) : null}

      {imageAreas.length > 0 ? (
        <PanelSection title="Images">
          {imageAreas.map((layer) => (
            <ImageAreaControl
              key={layer.id}
              layer={layer}
              onImageUpload={onImageUpload}
            />
          ))}
        </PanelSection>
      ) : null}
    </aside>
  );
}
