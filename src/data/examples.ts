/**
 * The built-in example mockups. These are the PSDs that ship in `/public` and
 * are surfaced as starter examples in the editor's empty state. The actual PSD
 * is fetched and parsed **client-side** (browser-native canvas); the server only
 * resolves a slug to this metadata and passes it as a prop.
 */
export interface Example {
  /** URL-safe identifier used in the `/examples/[slug]` route. */
  slug: string;
  /** Display title. */
  title: string;
  /** Path to the PSD under `/public` (may contain spaces — fine for fetch). */
  file: string;
  /** Optional path to a PNG preview under `/public` (may contain spaces). */
  img: string;
}

export const EXAMPLES: Example[] = [
  {
    slug: 'business-card',
    title: '3D Business Card',
    file: '/3D-Business-Card-Mockup.psd',
    img: '/cards.png',
  },
  {
    slug: 'book-cover',
    title: 'Book Cover',
    file: '/Book Cover Mockup.psd',
    img: '/book.png',
  },
  {
    slug: 't-shirt',
    title: 'T-Shirt',
    file: '/Realistic T-Shirt Front View Closeup Mockup.psd',
    img: '/t-shirt.png',
  },
];

/** Resolve a slug to its example, or undefined if no such example exists. */
export function getExample(slug: string): Example | undefined {
  return EXAMPLES.find((example) => example.slug === slug);
}
