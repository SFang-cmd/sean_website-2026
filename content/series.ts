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
    slug: "portraits",
    name: "Portraits",
    lede: "Graduation portraits and headshots. Available light where possible.",
  },
  {
    slug: "events",
    name: "Events",
    lede: "Performances, panels, and the rooms they happen in.",
  },
  {
    slug: "commercial",
    name: "Commercial",
    lede: "Product, food, and brand work. Lit on purpose, studio or on location.",
  },
  {
    slug: "sports",
    name: "Sports",
    lede: "Courtside and sideline. NBA games and more.",
  },
  {
    slug: "travel",
    name: "Travel",
    lede: "Places, mostly on foot, mostly strangers.",
  },
  {
    slug: "aerial",
    name: "Aerial",
    lede: "From the air. Shorelines, rooftops, the grid from 400 feet.",
  },
];
