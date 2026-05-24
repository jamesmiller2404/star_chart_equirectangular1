import {
  colorForStar,
  CONSTELLATION_LINE_OPACITY,
  constellationLineSegments,
  createHipStarMap,
  createDecTickMarks,
  createDecTicks,
  createRaMinuteTicks,
  createRaTicks,
  DEFAULT_CHART,
  DIM_STAR_OPACITY,
  escapeXml,
  GRID_OPACITY,
  labelForStar,
  MIN_STAR_RADIUS,
  pointForStar,
  PRINT_CHART,
  shouldLabelStar,
  starRadius,
} from './chart-model.mjs';

const ILLUSTRATOR_PX_PER_IN = 72;
const TARGET_MIN_STAR_DIAMETER_PX = 0.75;
const SVG_USER_UNITS_PER_ILLUSTRATOR_PX = PRINT_CHART.unitsPerIn / ILLUSTRATOR_PX_PER_IN;
const SVG_MIN_STAR_RADIUS = (TARGET_MIN_STAR_DIAMETER_PX / 2) * SVG_USER_UNITS_PER_ILLUSTRATOR_PX;
const SVG_RADIUS_SCALE = SVG_MIN_STAR_RADIUS / MIN_STAR_RADIUS;

function number(value) {
  return Math.round(value * 100) / 100;
}

function renderGrid(width, height, padding) {
  const lines = [
    `  <g id="grid" stroke="${PRINT_CHART.grid}" stroke-opacity="${GRID_OPACITY}" stroke-width="1" fill="${PRINT_CHART.mutedText}" font-family="Arial, Helvetica, sans-serif" font-size="18">`,
  ];

  for (const tick of createRaMinuteTicks(5)) {
    if (tick.isHour) continue;
    const x = padding + ((24 - tick.hour) / 24) * (width - padding * 2);
    const tickLength = tick.isMedium ? 18 : 9;
    const opacity = tick.isMedium ? GRID_OPACITY : 0.3;
    lines.push(`    <line x1="${number(x)}" y1="${padding}" x2="${number(x)}" y2="${padding + tickLength}" stroke-opacity="${opacity}" />`);
    lines.push(`    <line x1="${number(x)}" y1="${height - padding}" x2="${number(x)}" y2="${height - padding - tickLength}" stroke-opacity="${opacity}" />`);
  }

  for (const hour of createRaTicks(1)) {
    const x = padding + ((24 - hour) / 24) * (width - padding * 2);
    lines.push(`    <line x1="${number(x)}" y1="${padding}" x2="${number(x)}" y2="${height - padding}" stroke-opacity="${GRID_OPACITY}" />`);
    lines.push(`    <text x="${number(x)}" y="${padding - 20}" text-anchor="middle">${hour}h</text>`);
    lines.push(`    <text x="${number(x)}" y="${height - padding + 30}" text-anchor="middle">${hour}h</text>`);
  }

  for (const tick of createDecTickMarks(5)) {
    if (tick.isMajor) continue;
    const y = padding + ((90 - tick.dec) / 180) * (height - padding * 2);
    const tickLength = 9;
    lines.push(`    <line x1="${padding}" y1="${number(y)}" x2="${padding + tickLength}" y2="${number(y)}" stroke-opacity="0.3" />`);
    lines.push(`    <line x1="${width - padding}" y1="${number(y)}" x2="${width - padding - tickLength}" y2="${number(y)}" stroke-opacity="0.3" />`);
  }

  for (const dec of createDecTicks(10)) {
    const y = padding + ((90 - dec) / 180) * (height - padding * 2);
    lines.push(`    <line x1="${padding}" y1="${number(y)}" x2="${width - padding}" y2="${number(y)}" stroke-opacity="${GRID_OPACITY}" />`);
    lines.push(`    <text x="${padding - 12}" y="${number(y + 6)}" text-anchor="end">${dec > 0 ? '+' : ''}${dec}</text>`);
    lines.push(`    <text x="${width - padding + 12}" y="${number(y + 6)}" text-anchor="start">${dec > 0 ? '+' : ''}${dec}</text>`);
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderStars(id, stars, scale, opacity = 1) {
  const opacityAttribute = opacity < 1 ? ` opacity="${opacity}"` : '';
  const lines = [`  <g id="${id}"${opacityAttribute}>`];

  for (const star of stars) {
    const point = pointForStar(star);
    const radius = starRadius(star, scale) * SVG_RADIUS_SCALE;
    const strokeWidth = Math.max(0.08, Math.min(0.18, radius * 0.14));
    lines.push(
      `    <circle id="star-${star.id}" cx="${number(point.x)}" cy="${number(point.y)}" r="${number(radius)}" fill="${colorForStar(star)}" stroke="${PRINT_CHART.background}" stroke-width="${number(strokeWidth)}" />`,
    );
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderConstellationLines(dataset) {
  if (!dataset.constellations?.lines?.length) return '';

  const starsByHip = createHipStarMap(dataset.stars);
  const lines = [
    `  <g id="constellation-lines" fill="none" stroke="${PRINT_CHART.constellationLine}" stroke-opacity="${CONSTELLATION_LINE_OPACITY}" stroke-linecap="round" stroke-linejoin="round">`,
  ];

  for (const constellation of dataset.constellations.lines) {
    lines.push(`    <g id="constellation-${escapeXml(constellation.iau)}" data-name="${escapeXml(constellation.name)}">`);

    for (const path of constellation.paths) {
      const strokeWidth = path.style === 'bold' ? 2.4 : path.style === 'thin' ? 1.1 : 1.6;

      for (const [start, end] of constellationLineSegments(path, starsByHip)) {
        lines.push(
          `      <line x1="${number(start.x)}" y1="${number(start.y)}" x2="${number(end.x)}" y2="${number(end.y)}" stroke-width="${strokeWidth}" />`,
        );
      }
    }

    lines.push('    </g>');
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderLabels(stars) {
  const lines = [
    `  <g id="labels" fill="${PRINT_CHART.text}" font-family="Arial, Helvetica, sans-serif" font-size="18">`,
  ];

  for (const star of stars) {
    const point = pointForStar(star);
    lines.push(
      `    <text id="label-${star.id}" x="${number(point.x + 9)}" y="${number(point.y - 7)}">${escapeXml(labelForStar(star))}</text>`,
    );
  }

  lines.push('  </g>');
  return lines.join('\n');
}

export function renderStarChartSvg(dataset, options = {}) {
  const width = DEFAULT_CHART.width;
  const height = DEFAULT_CHART.height;
  const padding = DEFAULT_CHART.padding;
  const brightStars = dataset.stars.filter((star) => star.mag <= 4.2);
  const dimStars = dataset.stars.filter((star) => star.mag > 4.2);
  const labels = dataset.stars.filter(shouldLabelStar);
  const parts = [];

  if (options.xmlDeclaration) parts.push('<?xml version="1.0" encoding="UTF-8"?>');

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_CHART.widthIn}in" height="${PRINT_CHART.heightIn}in" viewBox="0 0 ${width} ${height}" role="img" aria-label="HYG v4.2 all-sky star chart">`,
    '  <title>HYG Star Chart</title>',
    `  <desc>HYG v4.2 star chart, magnitude &lt;= ${dataset.magLimit}, generated for Illustrator editing.</desc>`,
    '  <g id="background">',
    `    <rect width="${width}" height="${height}" fill="${PRINT_CHART.background}" />`,
    '  </g>',
    renderGrid(width, height, padding),
    renderConstellationLines(dataset),
    renderStars('stars-dim', dimStars, 1, DIM_STAR_OPACITY),
    renderStars('stars-bright', brightStars, 1.05),
    renderLabels(labels),
    `  <g id="frame" fill="none" stroke="${PRINT_CHART.frame}" stroke-width="2">`,
    `    <rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${height - padding * 2}" />`,
    '  </g>',
    `  <g id="legend" fill="${PRINT_CHART.mutedText}" font-family="Arial, Helvetica, sans-serif" font-size="18">`,
    `    <text x="${padding}" y="${height - 24}">HYG v4.2 / CC-BY-SA 4.0 / magnitude &lt;= ${dataset.magLimit} / ${dataset.count.toLocaleString()} stars</text>`,
    '  </g>',
    '</svg>',
    '',
  );

  return {
    svg: parts.join('\n'),
    labelCount: labels.length,
  };
}
