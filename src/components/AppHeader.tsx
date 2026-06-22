import Link from 'next/link';
import type { ChangeEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UploadButton } from '@/components/ui/UploadButton';

interface AppHeaderProps {
  /** Whether a PSD is loaded — drives the mobile menu + download visibility. */
  hasDocument: boolean;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
  onOpenSidebar: () => void;
}

/**
 * The top app bar: title, PSD upload (always), plus the mobile adjustments
 * menu and the PNG download button, which only appear once a document is open.
 */
export function AppHeader({
  hasDocument,
  onUpload,
  onDownload,
  onOpenSidebar,
}: AppHeaderProps) {
  return (
    <header className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
      {hasDocument ? (
        <button
          type="button"
          aria-label="Show adjustments"
          onClick={onOpenSidebar}
          className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
      ) : null}
      <h1 className="hidden sm:block text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        <Link href="/" className="hover:opacity-80">
          PSD Mockup Editor
        </Link>
      </h1>
      <UploadButton
        className="ml-auto"
        variant="solid"
        icon="upload"
        label="Upload PSD"
        accept=".psd"
        onChange={onUpload}
      />
      {hasDocument ? (
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:px-5 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Icon name="download" className="h-5 w-5" />
          <span className="hidden sm:inline">Download</span>
        </button>
      ) : null}
    </header>
  );
}
