import type { ChangeEvent } from 'react';
import { ColorLayerControl } from '@/components/controls/ColorLayerControl';
import { ImageAreaControl } from '@/components/controls/ImageAreaControl';
import { LayerToggleControl } from '@/components/controls/LayerToggleControl';
import { Icon } from '@/components/ui/Icon';
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
  /** Drawer open state — only affects the mobile (slide-in) layout. */
  open: boolean;
  onClose: () => void;
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
  open,
  onClose,
}: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] transform overflow-y-auto border-r border-zinc-200 bg-white p-6 transition-transform duration-200 ease-in-out space-y-8 dark:border-zinc-800 dark:bg-zinc-900 md:static md:z-auto md:max-w-none md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Mobile-only header with a close button. */}
      <div className="-mt-2 flex items-center justify-between md:hidden">
        <span className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Adjustments
        </span>
        <button
          type="button"
          aria-label="Close panel"
          onClick={onClose}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

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
