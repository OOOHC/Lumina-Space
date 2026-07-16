interface ShareMetadataInput {
  origin: string;
  slug: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
}

export interface ShareMetadata {
  documentTitle: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
}

export function buildShareMetadata(input: ShareMetadataInput): ShareMetadata {
  const description =
    input.description?.trim() || `An immersive photography exhibition by Lumina Space.`;
  return {
    documentTitle: `${input.title} — Lumina Space`,
    title: input.title,
    description,
    url: `${input.origin}/e/${encodeURIComponent(input.slug)}`,
    imageUrl: input.imageUrl,
  };
}
