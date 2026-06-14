export type Photo = {
  id: string;
  srcMedium: string;
  srcLarge: string;
  alt: string;
  photographer: string;
};

type PexelsPhoto = {
  id: number;
  src: { medium: string; large: string };
  alt?: string;
  photographer?: string;
};

export function mapPexelsPhotos(raw: unknown): Photo[] {
  if (!raw || typeof raw !== 'object') return [];
  const photos = (raw as { photos?: unknown }).photos;
  if (!Array.isArray(photos)) return [];
  return photos.map((p) => {
    const pp = p as PexelsPhoto;
    return {
      id: String(pp.id),
      srcMedium: pp.src.medium,
      srcLarge: pp.src.large,
      alt: pp.alt ?? '',
      photographer: pp.photographer ?? '',
    };
  });
}
