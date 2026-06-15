import type { ChangeEvent } from 'react';
import { Icon, type IconName } from './Icon';

interface UploadButtonProps {
  label: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  variant?: 'solid' | 'dashed';
  icon?: IconName;
  className?: string;
}

export function UploadButton({
  label,
  onChange,
  accept,
  variant = 'solid',
  icon,
  className,
}: UploadButtonProps) {
  const variantClass =
    variant === 'solid'
      ? 'cursor-pointer inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity'
      : 'flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer';

  return (
    <label
      className={className ? `${variantClass} ${className}` : variantClass}
    >
      {icon ? <Icon name={icon} className="h-5 w-5" /> : null}
      {label}
      <input
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />
    </label>
  );
}
