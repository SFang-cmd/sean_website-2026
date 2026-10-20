/**
 * Gallery series: the sections a client browses by. `slug` is what the
 * `series` column in content/shoots.csv must match (and the folder name under photos/). Order here is display
 * order in the gallery index. Ledes are one sentence; Sean rewrites them.
 */
export interface Series {
  slug: string;
  name: string;
  lede: string;
}

export const series: Series[] = [
  {
    slug: "sports",
    name: "Sports",
    lede: "Capturing Courtside Keepsakes.",
  },
  {
    slug: "grads",
    name: "Grads",
    lede: "One last lap around campus.",
  },
  {
    slug: "portraits",
    name: "Portraits",
    lede: "Bringing out the best light in people.",
  },
  {
    slug: "commercial",
    name: "Studio",
    lede: "For anything that deserves a studio moment.",
  },
  {
    slug: "events",
    name: "Events",
    lede: "For the moments that happen once.",
  },
  {
    slug: "travel",
    name: "Travel",
    lede: "Just for fun.",
  },
  {
    slug: "aerial",
    name: "Aerial",
    lede: "From the air. Shorelines, rooftops, the grid from 400 feet.",
  },
];
