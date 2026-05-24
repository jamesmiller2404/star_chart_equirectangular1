import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCORPIO_BOUNDS } from '../src/chart/render-svg.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'data', 'gaia', 'scorpio-gaia-dr3.json');
const tapUrl = 'https://gea.esac.esa.int/tap-server/tap/sync';

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

function parseCsv(body) {
  const lines = body.trim().split(/\r?\n/);
  const columns = parseCsvLine(lines[0]);

  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
  });
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const boundsDegrees = {
  raMin: SCORPIO_BOUNDS.raMin * 15,
  raMax: SCORPIO_BOUNDS.raMax * 15,
  decMin: SCORPIO_BOUNDS.decMin,
  decMax: SCORPIO_BOUNDS.decMax,
};

const query = `
SELECT
  source_id,
  ra,
  dec,
  phot_g_mean_mag,
  phot_bp_mean_mag,
  phot_rp_mean_mag,
  parallax,
  pmra,
  pmdec
FROM gaiadr3.gaia_source
WHERE ra BETWEEN ${boundsDegrees.raMin} AND ${boundsDegrees.raMax}
  AND dec BETWEEN ${boundsDegrees.decMin} AND ${boundsDegrees.decMax}
  AND phot_g_mean_mag IS NOT NULL
  AND phot_g_mean_mag <= ${SCORPIO_BOUNDS.magLimit}
ORDER BY phot_g_mean_mag ASC
`;

const requestBody = new URLSearchParams({
  REQUEST: 'doQuery',
  LANG: 'ADQL',
  FORMAT: 'csv',
  MAXREC: '200000',
  QUERY: query,
});

console.log('Querying Gaia DR3 for Scorpio inset sources...');
const response = await fetch(tapUrl, {
  method: 'POST',
  headers: {
    'content-type': 'application/x-www-form-urlencoded',
  },
  body: requestBody,
});

if (!response.ok) {
  throw new Error(`Gaia TAP request failed: ${response.status} ${response.statusText}\n${await response.text()}`);
}

const rows = parseCsv(await response.text());
const stars = rows.map((row) => {
  const mag = asNumber(row.phot_g_mean_mag);
  const raDegrees = asNumber(row.ra);
  const dec = asNumber(row.dec);

  return {
    id: `gaia-dr3-${row.source_id}`,
    sourceId: row.source_id,
    catalog: 'Gaia DR3',
    ra: raDegrees === null ? null : raDegrees / 15,
    dec,
    mag,
    gMag: mag,
    bpMag: asNumber(row.phot_bp_mean_mag),
    rpMag: asNumber(row.phot_rp_mean_mag),
    parallax: asNumber(row.parallax),
    pmra: asNumber(row.pmra),
    pmdec: asNumber(row.pmdec),
    proper: '',
    bf: '',
    con: 'Sco',
  };
}).filter((star) => star.ra !== null && star.dec !== null && star.mag !== null);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify({
  source: 'Gaia DR3 gaiadr3.gaia_source via ESA Gaia Archive TAP',
  sourceUrl: tapUrl,
  retrievedAt: new Date().toISOString(),
  query: query.trim(),
  bounds: {
    raHours: {
      min: SCORPIO_BOUNDS.raMin,
      max: SCORPIO_BOUNDS.raMax,
    },
    raDegrees: boundsDegrees,
    decDegrees: {
      min: SCORPIO_BOUNDS.decMin,
      max: SCORPIO_BOUNDS.decMax,
    },
  },
  magSystem: 'Gaia G',
  magLimit: SCORPIO_BOUNDS.magLimit,
  count: stars.length,
  stars,
})}\n`, 'utf8');

console.log(`Wrote ${stars.length} Gaia DR3 sources to ${outputPath}`);
