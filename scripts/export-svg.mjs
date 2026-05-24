import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { PLEIADES_M45_BOUNDS, renderStarChartSvg } from '../src/chart/render-svg.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hygInputPath = path.join(root, 'data', 'hyg', 'CURRENT', 'hyg_v42.csv.gz');
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

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }

  cells.push(cell);
  return cells;
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function readPleiadesStars() {
  const stars = [];
  const source = fs.createReadStream(hygInputPath).pipe(zlib.createGunzip());
  const reader = readline.createInterface({ input: source, crlfDelay: Infinity });
  let columns = null;

  for await (const line of reader) {
    if (!columns) {
      columns = parseCsvLine(line);
      continue;
    }

    const values = parseCsvLine(line);
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
    const id = Number(row.id);
    const hip = asNumber(row.hip);
    const mag = asNumber(row.mag);
    const ra = asNumber(row.ra);
    const dec = asNumber(row.dec);
    const proper = row.proper || '';

    if (
      !Number.isFinite(id) ||
      id === 0 ||
      mag === null ||
      ra === null ||
      dec === null ||
      proper === 'Sol' ||
      mag > PLEIADES_M45_BOUNDS.magLimit ||
      ra < PLEIADES_M45_BOUNDS.raMin ||
      ra > PLEIADES_M45_BOUNDS.raMax ||
      dec < PLEIADES_M45_BOUNDS.decMin ||
      dec > PLEIADES_M45_BOUNDS.decMax
    ) {
      continue;
    }

    stars.push({
      id,
      hip,
      ra,
      dec,
      mag,
      proper,
      bf: row.bf || '',
      con: row.con || '',
      spect: row.spect || '',
      ci: asNumber(row.ci),
    });
  }

  return stars.sort((a, b) => a.mag - b.mag);
}

const dataset = await readDataset();
const pleiadesStars = await readPleiadesStars();
const { svg, labelCount } = renderStarChartSvg(dataset, { xmlDeclaration: true, pleiadesStars });

for (const outputPath of outputPaths) {
  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
  await fsPromises.writeFile(outputPath, svg, 'utf8');
  console.log(`Wrote ${outputPath}`);
}

console.log(`SVG contains ${dataset.count} stars and ${labelCount} editable labels.`);
console.log(`Pleiades M45 inset contains ${pleiadesStars.length} stars to magnitude ${PLEIADES_M45_BOUNDS.magLimit}.`);
if (dataset.constellations) {
  console.log(`SVG contains ${dataset.constellations.count} constellation line groups.`);
}
