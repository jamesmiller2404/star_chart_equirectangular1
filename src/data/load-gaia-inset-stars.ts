import fs from 'node:fs/promises';
import path from 'node:path';
import { getInsetStarChart } from '@/src/chart/render-svg.mjs';

export type GaiaInsetStarRecord = {
  id: number;
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
};

const fetchScripts: Record<string, string> = {
  pleiades: 'fetch:pleiades',
  scorpio: 'fetch:scorpio',
};

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

  return catalog.stars
    .filter((star) => (
      star.mag <= chart.bounds.magLimit &&
      star.ra >= chart.bounds.raMin &&
      star.ra <= chart.bounds.raMax &&
      star.dec >= chart.bounds.decMin &&
      star.dec <= chart.bounds.decMax
    ))
    .sort((a, b) => a.mag - b.mag);
}
