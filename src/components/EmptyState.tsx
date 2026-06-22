import NextImage from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { EXAMPLES } from '@/data/examples';

interface EmptyStateProps {
  /** True while an example is being fetched/parsed on the /examples/[slug] route. */
  loading: boolean;
}

/**
 * What the canvas area shows when no PSD is loaded yet: a spinner while an
 * example is being fetched, otherwise the upload prompt and the built-in
 * examples grid. (Load errors are surfaced by the banner in Editor.)
 */
export function EmptyState({ loading }: EmptyStateProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 text-zinc-400 dark:text-zinc-600">
        <Icon
          name="image"
          className="h-12 w-12 animate-pulse"
          strokeWidth={1.5}
        />
        <p className="text-sm">Loading example…</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3 text-center text-zinc-400 dark:text-zinc-600">
        <Icon name="image" className="h-20 w-20" strokeWidth={1} />
        <p className="text-lg">Upload a PSD or try an example</p>
      </div>
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {EXAMPLES.map((example) => (
          <Link
            key={example.slug}
            href={`/examples/${example.slug}`}
            className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <NextImage
                src={example.img}
                alt={example.title}
                fill
                loading="eager"
                sizes="(max-width: 640px) 90vw, 30vw"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {example.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
