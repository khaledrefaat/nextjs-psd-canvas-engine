interface LayerToggleControlProps {
  name: string;
  visible: boolean;
  onToggle: () => void;
}

/**
 * A single layer's show/hide row: the layer name plus an on/off switch.
 * The label dims when the layer is hidden.
 */
export function LayerToggleControl({
  name,
  visible,
  onToggle,
}: LayerToggleControlProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={`text-sm font-medium truncate ${
          visible
            ? 'text-zinc-700 dark:text-zinc-300'
            : 'text-zinc-400 dark:text-zinc-600'
        }`}
      >
        {name}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        aria-label={visible ? `Hide ${name}` : `Show ${name}`}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          visible
            ? 'bg-zinc-900 dark:bg-zinc-100'
            : 'bg-zinc-300 dark:bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            visible ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
