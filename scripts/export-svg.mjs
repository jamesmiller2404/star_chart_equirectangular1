import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLEIADES_M45_BOUNDS, SCORPIO_BOUNDS, renderStarChartSvg } from '../src/chart/render-svg.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pleiadesInputPath = path.join(root, 'data', 'gaia', 'pleiades-m45-gaia-dr3.json');
const scorpioInputPath = path.join(root, 'data', 'gaia', 'scorpio-gaia-dr3.json');
const inputCandidates = [
  path.join(root, 'public', 'data', 'stars-mag-6_5.json'),
  path.join(root, 'poc', 'stars-mag-6_5.json'),
];
const outputPaths = [
  path.join(root, 'exports', 'hyg-star-chart-24x12.svg'),
  path.join(root, 'exports', 'hyg-star-chart-24x24.svg'),
];

async function readDataset() {
  for (const filePath of inputCandidates) {
    try {
      const body = await fsPromises.readFile(filePath, 'utf8');
      return JSON.parse(body);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  throw new Error('No generated star dataset found. Run npm run build:data first.');
}

async function readGaiaInsetStars({ filePath, bounds, name, fetchScript }) {
  let catalog;
  try {
    catalog = JSON.parse(await fsPromises.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`No Gaia DR3 ${name} cache found at ${filePath}. Run npm run ${fetchScript} first.`);
    }
    throw error;
  }

  return catalog.stars
    .filter((star) => (
      star.mag <= bounds.magLimit &&
      star.ra >= bounds.raMin &&
      star.ra <= bounds.raMax &&
      star.dec >= bounds.decMin &&
      star.dec <= bounds.decMax
    ))
    .sort((a, b) => a.mag - b.mag);
}

const dataset = await readDataset();
const pleiadesStars = await readGaiaInsetStars({
  filePath: pleiadesInputPath,
  bounds: PLEIADES_M45_BOUNDS,
  name: 'Pleiades',
  fetchScript: 'fetch:pleiades',
});
const scorpioStars = await readGaiaInsetStars({
  filePath: scorpioInputPath,
  bounds: SCORPIO_BOUNDS,
  name: 'Scorpio',
  fetchScript: 'fetch:scorpio',
});
const { svg, labelCount } = renderStarChartSvg(dataset, { xmlDeclaration: true, pleiadesStars, scorpioStars });

for (const outputPath of outputPaths) {
  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
  await fsPromises.writeFile(outputPath, svg, 'utf8');
  console.log(`Wrote ${outputPath}`);
}

console.log(`SVG contains ${dataset.count} stars and ${labelCount} editable labels.`);
console.log(`Pleiades M45 inset contains ${pleiadesStars.length} Gaia DR3 sources to G magnitude ${PLEIADES_M45_BOUNDS.magLimit}.`);
console.log(`Scorpio inset contains ${scorpioStars.length} Gaia DR3 sources to G magnitude ${SCORPIO_BOUNDS.magLimit}.`);
if (dataset.constellations) {
  console.log(`SVG contains ${dataset.constellations.count} constellation line groups.`);
}
