export const STUDIO_CATEGORIES = [
  "Photo Studio",
  "Film Stage",
  "Podcast Lounge",
  "Music Suite",
  "Workshop",
] as const;

export type StudioCategory = (typeof STUDIO_CATEGORIES)[number];
