export const STUDIO_CATEGORIES = [
  "Photo Studio",
  "Film Stage",
  "Podcast Lounge",
  "Music Suite",
  "Workshop",
] as const;

export type StudioCategory = (typeof STUDIO_CATEGORIES)[number];

export const POPULAR_AMENITIES = [
  "Cyc Wall",
  "Lighting Rig",
  "Green Room",
  "Soundproof",
  "Dressing Room",
  "Backdrops",
  "Wi-Fi",
  "Air Conditioning",
  "Kitchenette",
  "Freight Elevator",
] as const;

export type PopularAmenity = (typeof POPULAR_AMENITIES)[number];
