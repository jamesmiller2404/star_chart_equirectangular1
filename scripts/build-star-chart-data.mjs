import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';

const inputPath = new URL('../data/hyg/CURRENT/hyg_v42.csv.gz', import.meta.url);
const outputPaths = [
  new URL('../public/data/stars-mag-7_5.json', import.meta.url),
  new URL('../poc/stars-mag-7_5.json', import.meta.url),
];
const magLimit = 7.5;

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
  const proper = row.proper || '';

  if (mag === null || ra === null || dec === null || mag > magLimit || Number(row.id) === 0 || proper === 'Sol') {
    continue;
  }

  stars.push({
    id: Number(row.id),
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
    totalRows,
    count: stars.length,
    generatedAt: new Date().toISOString(),
    stars,
  })}\n`;

await Promise.all(outputPaths.map((outputPath) => fs.promises.writeFile(outputPath, output)));

console.log(`Read ${totalRows} catalog rows.`);
for (const outputPath of outputPaths) {
  console.log(`Wrote ${stars.length} stars with mag <= ${magLimit} to ${outputPath.pathname}`);
}
