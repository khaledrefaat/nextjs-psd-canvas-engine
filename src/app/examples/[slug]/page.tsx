import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Editor from '@/components/Editor';
import { EXAMPLES, getExample } from '@/data/examples';

// Pre-render a page per example at build time.
export function generateStaticParams() {
  return EXAMPLES.map(example => ({ slug: example.slug }));
}

// Per-example page titles (nice for tabs / sharing).
export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const example = getExample(slug);
    return {
      title: example
        ? `${example.title} — PSD Mockup Editor`
        : 'PSD Mockup Editor',
    };
  });
}

export default async function ExamplePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const example = getExample(slug);
  if (!example) notFound();

  // The server only resolves slug → metadata. The client fetches + parses the
  // PSD (see Editor's initialExample handling).
  return <Editor initialExample={example} />;
}
