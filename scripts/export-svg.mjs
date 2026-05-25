import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INSET_STAR_CHARTS,
  MAIN_STAR_CHART_ID,
  STAR_CHART_IDS,
  getInsetStarChart,
  normalizeStarChartId,
  renderInsetStarChartSvg,
  renderMainStarChartSvg,
} from '../src/chart/render-svg.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gaiaInputPaths = {
  pleiades: path.join(root, 'data', 'gaia', 'pleiades-m45-gaia-dr3.json'),
  scorpio: path.join(root, 'data', 'gaia', 'scorpio-gaia-dr3.json'),
};
const fetchScripts = {
  pleiades: 'fetch:pleiades',
  scorpio: 'fetch:scorpio',
};
const inputCandidates = [
  path.join(root, 'public', 'data', 'stars-mag-6_5.json'),
  path.join(root, 'poc', 'stars-mag-6_5.json'),
];
const defaultOutputPaths = {
  main: path.join(root, 'exports', 'hyg-star-chart-main-24x12.svg'),
  pleiades: path.join(root, 'exports', INSET_STAR_CHARTS.pleiades.outputFileName),
  scorpio: path.join(root, 'exports', INSET_STAR_CHARTS.scorpio.outputFileName),
};

function usage() {
  return [
    'Usage: npm run export:svg -- [--chart main|pleiades|scorpio|all] [--output path]',
    '',
    'Examples:',
    '  npm run export:svg -- --chart main',
    '  npm run export:svg -- --chart pleiades',
    '  npm run export:svg -- --chart scorpio --output exports/scorpio.svg',
    '  npm run export:svg -- --chart all',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    chart: 'all',
    outputPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--chart' || arg === '-c') {
      options.chart = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--chart=')) {
      options.chart = arg.slice('--chart='.length);
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      options.outputPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--output=')) {
      options.outputPath = arg.slice('--output='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}\n\n${usage()}`);
  }

  if (!options.chart) throw new Error(`Missing --chart value.\n\n${usage()}`);
  if (options.outputPath === '') throw new Error(`Missing --output value.\n\n${usage()}`);

  return options;
}

function selectedChartIds(chartOption) {
  const normalizedOption = String(chartOption).trim().toLowerCase();
  if (normalizedOption === 'all') return STAR_CHART_IDS;

  const chartId = normalizeStarChartId(normalizedOption);
  if (!chartId) {
    throw new Error(`Unknown chart "${chartOption}". Use main, pleiades, scorpio, or all.`);
  }

  return [chartId];
}

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

async function readGaiaInsetStars(chartId) {
  const chart = getInsetStarChart(chartId);
  if (!chart) throw new Error(`Unknown inset chart "${chartId}".`);

  let catalog;
  try {
    catalog = JSON.parse(await fsPromises.readFile(gaiaInputPaths[chart.id], 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`No Gaia DR3 ${chart.title} cache found at ${gaiaInputPaths[chart.id]}. Run npm run ${fetchScripts[chart.id]} first.`);
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

async function writeSvg(outputPath, svg) {
  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
  await fsPromises.writeFile(outputPath, svg, 'utf8');
  console.log(`Wrote ${outputPath}`);
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  console.log(usage());
  process.exit(0);
}

const chartIds = selectedChartIds(options.chart);
if (options.outputPath && chartIds.length !== 1) {
  throw new Error('--output can only be used when exporting a single chart.');
}

for (const chartId of chartIds) {
  const outputPath = options.outputPath
    ? path.resolve(root, options.outputPath)
    : defaultOutputPaths[chartId];

  if (chartId === MAIN_STAR_CHART_ID) {
    const dataset = await readDataset();
    const { svg, labelCount } = renderMainStarChartSvg(dataset, { xmlDeclaration: true });
    await writeSvg(outputPath, svg);
    console.log(`Main chart contains ${dataset.count} stars and ${labelCount} editable labels.`);
    if (dataset.constellations) {
      console.log(`Main chart contains ${dataset.constellations.count} constellation line groups.`);
    }
    continue;
  }

  const chart = getInsetStarChart(chartId);
  const stars = await readGaiaInsetStars(chartId);
  const { svg } = renderInsetStarChartSvg(chartId, stars, { xmlDeclaration: true });
  await writeSvg(outputPath, svg);
  console.log(`${chart.title} inset contains ${stars.length} Gaia DR3 sources to G magnitude ${chart.bounds.magLimit}.`);
}
