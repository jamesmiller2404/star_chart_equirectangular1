import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderStarChartSvg } from '../src/chart/render-svg.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputCandidates = [
  path.join(root, 'public', 'data', 'stars-mag-6_5.json'),
  path.join(root, 'poc', 'stars-mag-6_5.json'),
];
const outputPath = path.join(root, 'exports', 'hyg-star-chart-24x12.svg');

async function readDataset() {
  for (const filePath of inputCandidates) {
    try {
      const body = await fs.readFile(filePath, 'utf8');
      return JSON.parse(body);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  throw new Error('No generated star dataset found. Run npm run build:data first.');
}

const dataset = await readDataset();
const { svg, labelCount } = renderStarChartSvg(dataset, { xmlDeclaration: true });

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, svg, 'utf8');

console.log(`Wrote ${outputPath}`);
console.log(`SVG contains ${dataset.count} stars and ${labelCount} editable labels.`);
