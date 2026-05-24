import fs from 'node:fs/promises';
import path from 'node:path';

export type StarRecord = {
  id: number;
  hip: number | null;
  ra: number;
  dec: number;
  mag: number;
  proper: string;
  bf: string;
  con: string;
  spect: string;
  ci: number | null;
};

export type ConstellationLinePath = {
  style: string;
  hips: number[];
};

export type ConstellationLine = {
  id: string;
  iau: string;
  name: string;
  englishName: string;
  paths: ConstellationLinePath[];
};

export type ConstellationDataset = {
  source: string;
  license: string;
  culture: string;
  count: number;
  lines: ConstellationLine[];
};

export type StarDataset = {
  source: string;
  license: string;
  magLimit: number;
  magnitudeLimitedCount?: number;
  constellationEndpointCount?: number;
  totalRows: number;
  count: number;
  generatedAt: string;
  constellations?: ConstellationDataset;
  stars: StarRecord[];
};

export async function loadStarDataset(): Promise<StarDataset> {
  const candidates = [
    path.join(process.cwd(), 'public', 'data', 'stars-mag-6_5.json'),
    path.join(process.cwd(), 'poc', 'stars-mag-6_5.json'),
  ];

  for (const filePath of candidates) {
    try {
      const body = await fs.readFile(filePath, 'utf8');
      return JSON.parse(body) as StarDataset;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }
  }

  throw new Error('No generated star dataset found. Run npm run build:data.');
}
