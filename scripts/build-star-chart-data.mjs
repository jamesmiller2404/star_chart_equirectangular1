import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';

const inputPath = new URL('../data/hyg/CURRENT/hyg_v42.csv.gz', import.meta.url);
const constellationInputPath = new URL('../data/constellations/stellarium-western-index.json', import.meta.url);
const outputPaths = [
  new URL('../public/data/stars-mag-6_5.json', import.meta.url),
  new URL('../poc/stars-mag-6_5.json', import.meta.url),
];
const magLimit = 6.5;

const skyCulture = JSON.parse(await fs.promises.readFile(constellationInputPath, 'utf8'));
const constellations = skyCulture.constellations.map((constellation) => ({
  id: constellation.id,
  iau: constellation.iau || constellation.id.split(' ').at(-1) || '',
  name: constellation.common_name?.native || constellation.common_name?.english || constellation.iau || constellation.id,
  englishName: constellation.common_name?.english || '',
  paths: (constellation.lines || []).map((line) => {
    const style = typeof line[0] === 'string' ? line[0] : 'normal';
    return {
      style,
      hips: line.filter((item) => Number.isInteger(item)),
    };
  }),
}));
const constellationEndpointHips = new Set(
  constellations.flatMap((constellation) => constellation.paths.flatMap((line) => line.hips)),
);

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

await Promise.all(outputPaths.map((outputPath) => fs.promises.mkdir(new URL('./', outputPath), { recursive: true })));

const source = fs.createReadStream(inputPath).pipe(zlib.createGunzip());
const reader = readline.createInterface({ input: source, crlfDelay: Infinity });

let columns = null;
let totalRows = 0;
const stars = [];

for await (const line of reader) {
  if (!columns) {
    columns = parseCsvLine(line);
    continue;
  }

  totalRows += 1;
  const values = parseCsvLine(line);
  const row = Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
  const mag = asNumber(row.mag);
  const ra = asNumber(row.ra);
  const dec = asNumber(row.dec);
  const hip = asNumber(row.hip);
  const proper = row.proper || '';

  const isConstellationEndpoint = hip !== null && constellationEndpointHips.has(hip);

  if (mag === null || ra === null || dec === null || Number(row.id) === 0 || proper === 'Sol') {
    continue;
  }

  if (mag > magLimit && !isConstellationEndpoint) {
    continue;
  }

  stars.push({
    id: Number(row.id),
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

stars.sort((a, b) => a.mag - b.mag);

const output = `${JSON.stringify({
    source: 'HYG v4.2 data/hyg/CURRENT/hyg_v42.csv.gz',
    license: 'CC-BY-SA 4.0',
    magLimit,
    magnitudeLimitedCount: stars.filter((star) => star.mag <= magLimit).length,
    constellationEndpointCount: stars.filter((star) => star.mag > magLimit && star.hip !== null && constellationEndpointHips.has(star.hip)).length,
    totalRows,
    count: stars.length,
    generatedAt: new Date().toISOString(),
    constellations: {
      source: 'Stellarium western sky culture data/constellations/stellarium-western-index.json',
      license: 'CC BY-SA',
      culture: skyCulture.id,
      count: constellations.length,
      lines: constellations,
    },
    stars,
  })}\n`;

await Promise.all(outputPaths.map((outputPath) => fs.promises.writeFile(outputPath, output)));

console.log(`Read ${totalRows} catalog rows.`);
for (const outputPath of outputPaths) {
  console.log(`Wrote ${stars.length} stars and ${constellations.length} constellation line groups to ${outputPath.pathname}`);
}
