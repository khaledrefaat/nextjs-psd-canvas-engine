import type { ChangeEvent } from 'react';
import { ColorLayerControl } from '@/components/controls/ColorLayerControl';
import { ImageAreaControl } from '@/components/controls/ImageAreaControl';
import { LayerToggleControl } from '@/components/controls/LayerToggleControl';
import { PanelSection } from '@/components/ui/PanelSection';
import type { ColorLayer, ImageArea } from '@/types/layer';
import { cleanLayerName } from '@/utils/mockupLayers';

interface SidebarProps {
  layerNames: string[];
  hiddenLayers: Set<string>;
  colorLayers: ColorLayer[];
  imageAreas: ImageArea[];
  onToggleLayer: (layerName: string) => void;
  onColorChange: (layerId: string, newColor: string) => void;
  onImageUpload: (layerId: string, e: ChangeEvent<HTMLInputElement>) => void;
  onOpenTransform: (layerId: string) => void;
}

export function Sidebar({
  layerNames,
  hiddenLayers,
  colorLayers,
  imageAreas,
  onToggleLayer,
  onColorChange,
  onImageUpload,
  onOpenTransform,
}: SidebarProps) {
  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-8">
      {layerNames.length > 0 ? (
        <PanelSection title="Layers">
          {layerNames.map((name) => (
            <LayerToggleControl
              key={name}
              name={cleanLayerName(name)}
              visible={!hiddenLayers.has(name)}
              onToggle={() => onToggleLayer(name)}
            />
          ))}
        </PanelSection>
      ) : null}

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
              onOpenTransform={onOpenTransform}
            />
          ))}
        </PanelSection>
      ) : null}
    </aside>
  );
}
