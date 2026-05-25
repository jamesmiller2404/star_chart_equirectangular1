import fs from 'node:fs/promises';
import path from 'node:path';
import { getInsetStarChart, isCoordinateInsideInsetBounds } from '@/src/chart/render-svg.mjs';

export type GaiaInsetStarRecord = {
  id: number | string;
  sourceId?: number | string;
  catalog?: string;
  hip?: number | null;
  ra: number;
  dec: number;
  mag: number;
  proper?: string;
  bf?: string;
  con?: string;
  spect?: string;
  ci?: number | null;
};

const inputPaths: Record<string, string> = {
  pleiades: path.join(process.cwd(), 'data', 'gaia', 'pleiades-m45-gaia-dr3.json'),
  scorpio: path.join(process.cwd(), 'data', 'gaia', 'scorpio-gaia-dr3.json'),
  lyra: path.join(process.cwd(), 'data', 'gaia', 'lyra-gaia-dr3.json'),
};

const hygInputCandidates = [
  path.join(process.cwd(), 'public', 'data', 'stars-mag-7_5.json'),
  path.join(process.cwd(), 'poc', 'stars-mag-7_5.json'),
  path.join(process.cwd(), 'public', 'data', 'stars-mag-6_5.json'),
  path.join(process.cwd(), 'poc', 'stars-mag-6_5.json'),
];

const fetchScripts: Record<string, string> = {
  pleiades: 'fetch:pleiades',
  scorpio: 'fetch:scorpio',
  lyra: 'fetch:lyra',
};

function isInBounds(star: GaiaInsetStarRecord, chart: NonNullable<ReturnType<typeof getInsetStarChart>>) {
  return isCoordinateInsideInsetBounds(chart.bounds, star.ra, star.dec, star.mag);
}

function angularDistanceArcsec(a: GaiaInsetStarRecord, b: GaiaInsetStarRecord) {
  const degreesToRadians = Math.PI / 180;
  const raA = a.ra * 15 * degreesToRadians;
  const raB = b.ra * 15 * degreesToRadians;
  const decA = a.dec * degreesToRadians;
  const decB = b.dec * degreesToRadians;
  const deltaRa = raA - raB;
  const deltaDec = decA - decB;
  const sinDeltaDec = Math.sin(deltaDec / 2);
  const sinDeltaRa = Math.sin(deltaRa / 2);
  const haversine = sinDeltaDec ** 2 + Math.cos(decA) * Math.cos(decB) * sinDeltaRa ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(haversine))) / degreesToRadians * 3600;
}

function isNearAnyHygStar(star: GaiaInsetStarRecord, hygStars: GaiaInsetStarRecord[]) {
  const matchRadiusArcsec = 20;
  return hygStars.some((hygStar) => angularDistanceArcsec(star, hygStar) <= matchRadiusArcsec);
}

async function loadHygInsetStars(chart: NonNullable<ReturnType<typeof getInsetStarChart>>): Promise<GaiaInsetStarRecord[]> {
  for (const filePath of hygInputCandidates) {
    try {
      const catalog = JSON.parse(await fs.readFile(filePath, 'utf8')) as { stars: GaiaInsetStarRecord[] };
      return catalog.stars
        .filter((star) => isInBounds(star, chart))
        .map((star) => ({
          ...star,
          catalog: 'HYG v4.2',
          sourceId: star.id,
        }));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }
  }

  throw new Error('No generated HYG star dataset found. Run npm run build:data first.');
}

export async function loadGaiaInsetStars(chartId: string): Promise<GaiaInsetStarRecord[]> {
  const chart = getInsetStarChart(chartId);
  if (!chart) throw new Error(`Unknown inset chart "${chartId}".`);

  let catalog: { stars: GaiaInsetStarRecord[] };
  try {
    catalog = JSON.parse(await fs.readFile(inputPaths[chart.id], 'utf8')) as { stars: GaiaInsetStarRecord[] };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`No Gaia DR3 ${chart.title} cache found at ${inputPaths[chart.id]}. Run npm run ${fetchScripts[chart.id]} first.`);
    }
    throw error;
  }

  const gaiaStars = catalog.stars.filter((star) => isInBounds(star, chart));

  if (chart.catalogPriority !== 'hyg-gaia') {
    return gaiaStars.sort((a, b) => a.mag - b.mag);
  }

  const hygStars = await loadHygInsetStars(chart);
  return [
    ...hygStars,
    ...gaiaStars.filter((star) => !isNearAnyHygStar(star, hygStars)),
  ].sort((a, b) => a.mag - b.mag);
}
