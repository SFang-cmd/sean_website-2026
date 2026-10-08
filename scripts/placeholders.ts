/**
 * DEV-ONLY placeholder photos for the B side.
 *
 * Generates ~40 flat, muted-tint images (no photos, no text) at the same
 * renditions the real pipeline (scripts/photos.ts, `npm run photos`) will
 * produce, plus a matching content/photos.json that satisfies the `Photo`
 * interface in lib/photos.ts. This exists only so /photo and /photo/gallery
 * can be viewed before real photos land (Phase 5). Running the real pipeline
 * overwrites both outputs; delete public/photos/placeholder-* at that point.
 *
 *   npx tsx scripts/placeholders.ts
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "photos");
const MANIFEST = path.join(ROOT, "content", "photos.json");
const WIDTHS = [480, 960, 1600];
const LONG_EDGE = 2400; // pretend-original size, like a Lightroom export

// Muted tints from docs/prototypes/b-home.html.
const TINTS = [
  "#3b3f46", "#6b5b4a", "#5c6f7a", "#52404f", "#4f5a44", "#45505a", "#36445a",
  "#5a5247", "#6a6e6a", "#3d3a44", "#4b5566", "#8a8578", "#2f3440", "#726a5c",
  "#55606b", "#6c7d6a", "#4f5f6a", "#3a3542",
];
const RATIOS: [number, number][] = [[3, 2], [4, 5], [3, 2], [1, 1], [4, 5], [3, 2], [16, 9], [4, 5]];

type Seed = { title: string; place: string; series: string; alt: string };
const SEEDS: Seed[] = [
  { title: "Last train", place: "Philadelphia", series: "travel", alt: "A man waits alone on an empty SEPTA platform at night" },
  { title: "Hold still", place: "Chinatown", series: "portraits", alt: "Graduation portrait under a red awning" },
  { title: "Flyover", place: "Jersey shore", series: "aerial", alt: "Shoreline from above with a line of surf" },
  { title: "Baseline", place: "Wells Fargo Center", series: "sports", alt: "A guard drives baseline past two defenders" },
  { title: "Neon, wet", place: "Center City", series: "travel", alt: "Rain-slick street reflecting a neon sign" },
  { title: "Corner store", place: "West Philly", series: "travel", alt: "A corner store lit from inside at dusk" },
  { title: "Grid from 400ft", place: "Camden", series: "aerial", alt: "City blocks seen straight down from a drone" },
  { title: "Blue hour", place: "Schuylkill", series: "travel", alt: "The river at blue hour with the skyline behind" },
  { title: "Passenger", place: "SEPTA", series: "portraits", alt: "A passenger looks out a train window" },
  { title: "Fog line", place: "Fairmount", series: "aerial", alt: "Fog sitting in a line over the park from above" },
  { title: "After hours", place: "Fishtown", series: "travel", alt: "An empty bar patio after closing" },
  { title: "Window seat", place: "NYC", series: "travel", alt: "Manhattan seen from an airplane window" },
  { title: "Salt flats", place: "Utah", series: "aerial", alt: "A single car crossing white salt flats from above" },
  { title: "Underpass", place: "Philadelphia", series: "travel", alt: "A cyclist passing under a rail bridge" },
  { title: "Rooftop", place: "Center City", series: "portraits", alt: "Portrait on a rooftop with the city out of focus" },
  { title: "Crosswalk", place: "Chinatown", series: "travel", alt: "Pedestrians crossing under a paper lantern" },
  { title: "Dock", place: "Jersey shore", series: "aerial", alt: "A wooden dock reaching into still water" },
  { title: "Tide line", place: "Jersey shore", series: "aerial", alt: "The tide line drawn across sand from above" },
  { title: "Shift change", place: "SEPTA", series: "portraits", alt: "A conductor steps off a train at the end of a shift" },
  { title: "Free throw", place: "Palestra", series: "sports", alt: "A player at the line, crowd blurred behind" },
  { title: "Tip-off", place: "Wells Fargo Center", series: "sports", alt: "Two centers jumping for the opening tip" },
  { title: "Sideline", place: "Franklin Field", series: "sports", alt: "Players watching from the sideline in the rain" },
  { title: "Commencement", place: "College Green", series: "portraits", alt: "A graduate in a cap and gown on College Green" },
  { title: "Headshot, north light", place: "Studio", series: "portraits", alt: "A headshot lit by a north-facing window" },
  { title: "Locust Walk", place: "University City", series: "portraits", alt: "Graduation portrait under the trees on Locust Walk" },
  { title: "Fast break", place: "Palestra", series: "sports", alt: "A fast break seen from behind the basket" },
  { title: "Overtime", place: "Wells Fargo Center", series: "sports", alt: "Bench reaction in the final seconds of overtime" },
  { title: "Morning market", place: "Italian Market", series: "travel", alt: "Produce stands opening on a cold morning" },
  { title: "Boardwalk", place: "Jersey shore", series: "aerial", alt: "The boardwalk and beach umbrellas from above" },
  { title: "Reservoir", place: "Fairmount", series: "aerial", alt: "The reservoir and tree line from 400 feet" },
  { title: "Warmups", place: "Franklin Field", series: "sports", alt: "Sprinters warming up in lane one" },
  { title: "Two of them", place: "Rittenhouse", series: "portraits", alt: "A couple's portrait on a park bench" },
  { title: "Ferry", place: "NYC", series: "travel", alt: "Passengers on the deck of the Staten Island ferry" },
  { title: "Night court", place: "South Philly", series: "sports", alt: "A pickup game under floodlights" },
  { title: "Causeway", place: "Utah", series: "aerial", alt: "A causeway dividing two colors of water" },
  { title: "Last light", place: "Schuylkill", series: "travel", alt: "Rowers on the river in the last light" },
  { title: "Press row", place: "Wells Fargo Center", series: "sports", alt: "The view from press row during a timeout" },
  { title: "Senior portrait", place: "Locust Walk", series: "portraits", alt: "Senior portrait in front of the Quad gate" },
  { title: "Inlet", place: "Jersey shore", series: "aerial", alt: "A tidal inlet from directly above" },
  { title: "Platform", place: "30th Street", series: "travel", alt: "Travelers on a platform at 30th Street Station" },
];
const HOME_COUNT = 36;

function tintSvg(w: number, h: number, hex: string) {
  // A very faint diagonal lift so blur placeholders read as something, but
  // still a flat tint to the eye. Keeps JPEGs tiny.
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.05"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.07"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="${hex}"/>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`,
  );
}

async function main() {
  await mkdir(OUT, { recursive: true });
  // Only our own files: never touch real pipeline output.
  const { readdir } = await import("node:fs/promises");
  for (const f of await readdir(OUT)) {
    if (f.startsWith("placeholder-")) await rm(path.join(OUT, f));
  }

  const manifest = [];
  for (let i = 0; i < SEEDS.length; i++) {
    const seed = SEEDS[i];
    const [rw, rh] = RATIOS[i % RATIOS.length];
    const landscape = rw >= rh;
    const width = landscape ? LONG_EDGE : Math.round((LONG_EDGE * rw) / rh);
    const height = landscape ? Math.round((LONG_EDGE * rh) / rw) : LONG_EDGE;
    const id = `placeholder-${String(i + 1).padStart(2, "0")}`;
    const src = sharp(tintSvg(width, height, TINTS[(i * 7) % TINTS.length]));

    const renditions = [];
    for (const w of WIDTHS) {
      const resized = src.clone().resize({ width: w });
      await resized.clone().avif({ quality: 50 }).toFile(path.join(OUT, `${id}-${w}.avif`));
      await resized.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(OUT, `${id}-${w}.jpg`));
      renditions.push({ width: w, avif: `/photos/${id}-${w}.avif`, jpg: `/photos/${id}-${w}.jpg` });
    }
    const blurBuf = await src.clone().resize({ width: 20 }).jpeg({ quality: 50 }).toBuffer();
    const home = i < HOME_COUNT;
    manifest.push({
      id,
      file: `${id}.jpg`,
      width,
      height,
      renditions,
      blur: `data:image/jpeg;base64,${blurBuf.toString("base64")}`,
      title: seed.title,
      place: seed.place,
      year: 2026 - (i % 4),
      series: seed.series,
      home,
      order: home ? i + 1 : null,
      alt: seed.alt,
    });
    process.stdout.write(`${id} ${width}x${height}\n`);
  }
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`wrote ${manifest.length} entries to content/photos.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
