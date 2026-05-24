import {
  colorForStar,
  CONSTELLATION_LINE_OPACITY,
  CONSTELLATION_LINE_WIDTH_PT,
  constellationLineSegments,
  createHipStarMap,
  createDecTickMarks,
  createDecTicks,
  createRaMinuteTicks,
  createRaTicks,
  DEFAULT_CHART,
  DIM_STAR_OPACITY,
  escapeXml,
  GRID_LABEL_OPACITY,
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

export const PLEIADES_M45_BOUNDS = {
  raMin: 3 + 42 / 60,
  raMax: 3 + 52 / 60,
  decMin: 23 + 15 / 60,
  decMax: 25 + 15 / 60,
  magLimit: 10,
};

const PLEIADES_INSET = {
  x: 1550,
  y: 70,
  width: 780,
  height: 720,
  paddingLeft: 76,
  paddingRight: 36,
  paddingTop: 78,
  paddingBottom: 66,
};

function number(value) {
  return Math.round(value * 100) / 100;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function renderGrid(width, height, padding) {
  const lines = [
    `  <g id="grid" stroke="${PRINT_CHART.grid}" stroke-opacity="${GRID_OPACITY}" stroke-width="1">`,
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
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderGridLabels(width, height, padding) {
  const lines = [
    `  <g id="ra-dec-labels" fill="${PRINT_CHART.mutedText}" fill-opacity="${GRID_LABEL_OPACITY}" font-family="Arial, Helvetica, sans-serif" font-size="18">`,
  ];

  for (const hour of createRaTicks(1)) {
    const x = padding + ((24 - hour) / 24) * (width - padding * 2);
    lines.push(`    <text x="${number(x)}" y="${padding - 20}" text-anchor="middle">${hour}h</text>`);
    lines.push(`    <text x="${number(x)}" y="${height - padding + 30}" text-anchor="middle">${hour}h</text>`);
  }

  for (const dec of createDecTicks(10)) {
    const y = padding + ((90 - dec) / 180) * (height - padding * 2);
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
      for (const [start, end] of constellationLineSegments(path, starsByHip)) {
        lines.push(
          `      <line x1="${number(start.x)}" y1="${number(start.y)}" x2="${number(end.x)}" y2="${number(end.y)}" stroke-width="${CONSTELLATION_LINE_WIDTH_PT}pt" />`,
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

function formatRaLabel(ra) {
  const totalMinutes = Math.round(ra * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${String(minutes).padStart(2, '0')}m`;
}

function formatDecLabel(dec) {
  const sign = dec >= 0 ? '+' : '-';
  const absolute = Math.abs(dec);
  const degrees = Math.floor(absolute);
  const minutes = Math.round((absolute - degrees) * 60);
  return `${sign}${degrees} deg ${String(minutes).padStart(2, '0')}'`;
}

function pointForPleiadesStar(star) {
  const plotWidth = PLEIADES_INSET.width - PLEIADES_INSET.paddingLeft - PLEIADES_INSET.paddingRight;
  const plotHeight = PLEIADES_INSET.height - PLEIADES_INSET.paddingTop - PLEIADES_INSET.paddingBottom;
  return {
    x: PLEIADES_INSET.paddingLeft + ((PLEIADES_M45_BOUNDS.raMax - star.ra) / (PLEIADES_M45_BOUNDS.raMax - PLEIADES_M45_BOUNDS.raMin)) * plotWidth,
    y: PLEIADES_INSET.paddingTop + ((PLEIADES_M45_BOUNDS.decMax - star.dec) / (PLEIADES_M45_BOUNDS.decMax - PLEIADES_M45_BOUNDS.decMin)) * plotHeight,
  };
}

function pleiadesStarRadius(star) {
  const minRadius = 0.75;
  const maxRadius = 4.8;
  const brightness = Math.min(1, Math.max(0, (PLEIADES_M45_BOUNDS.magLimit - star.mag) / 8.4));
  return minRadius + smoothstep(brightness) * (maxRadius - minRadius);
}

function renderPleiadesGrid() {
  const plotX = PLEIADES_INSET.paddingLeft;
  const plotY = PLEIADES_INSET.paddingTop;
  const plotWidth = PLEIADES_INSET.width - PLEIADES_INSET.paddingLeft - PLEIADES_INSET.paddingRight;
  const plotHeight = PLEIADES_INSET.height - PLEIADES_INSET.paddingTop - PLEIADES_INSET.paddingBottom;
  const lines = [
    `    <g id="pleiades-m45-grid" stroke="${PRINT_CHART.grid}" stroke-width="1">`,
  ];

  for (let totalMinutes = 42; totalMinutes <= 52; totalMinutes += 2) {
    const ra = 3 + totalMinutes / 60;
    const x = plotX + ((PLEIADES_M45_BOUNDS.raMax - ra) / (PLEIADES_M45_BOUNDS.raMax - PLEIADES_M45_BOUNDS.raMin)) * plotWidth;
    lines.push(`      <line x1="${number(x)}" y1="${plotY}" x2="${number(x)}" y2="${number(plotY + plotHeight)}" stroke-opacity="${GRID_OPACITY}" />`);
  }

  for (let minutes = 15; minutes <= 135; minutes += 15) {
    const dec = 23 + minutes / 60;
    const y = plotY + ((PLEIADES_M45_BOUNDS.decMax - dec) / (PLEIADES_M45_BOUNDS.decMax - PLEIADES_M45_BOUNDS.decMin)) * plotHeight;
    const opacity = minutes % 30 === 0 ? GRID_OPACITY : 0.24;
    lines.push(`      <line x1="${plotX}" y1="${number(y)}" x2="${number(plotX + plotWidth)}" y2="${number(y)}" stroke-opacity="${opacity}" />`);
  }

  lines.push('    </g>');
  return lines.join('\n');
}

function renderPleiadesCoordinateLabels() {
  const plotX = PLEIADES_INSET.paddingLeft;
  const plotY = PLEIADES_INSET.paddingTop;
  const plotWidth = PLEIADES_INSET.width - PLEIADES_INSET.paddingLeft - PLEIADES_INSET.paddingRight;
  const plotHeight = PLEIADES_INSET.height - PLEIADES_INSET.paddingTop - PLEIADES_INSET.paddingBottom;
  const lines = [
    `    <g id="pleiades-m45-coordinate-labels" fill="${PRINT_CHART.mutedText}" fill-opacity="${GRID_LABEL_OPACITY}" font-family="Arial, Helvetica, sans-serif" font-size="13">`,
  ];

  for (let totalMinutes = 42; totalMinutes <= 52; totalMinutes += 2) {
    const ra = 3 + totalMinutes / 60;
    const x = plotX + ((PLEIADES_M45_BOUNDS.raMax - ra) / (PLEIADES_M45_BOUNDS.raMax - PLEIADES_M45_BOUNDS.raMin)) * plotWidth;
    lines.push(`      <text x="${number(x)}" y="${number(plotY - 10)}" text-anchor="middle">${formatRaLabel(ra)}</text>`);
    lines.push(`      <text x="${number(x)}" y="${number(plotY + plotHeight + 25)}" text-anchor="middle">${formatRaLabel(ra)}</text>`);
  }

  for (let minutes = 15; minutes <= 135; minutes += 30) {
    const dec = 23 + minutes / 60;
    const y = plotY + ((PLEIADES_M45_BOUNDS.decMax - dec) / (PLEIADES_M45_BOUNDS.decMax - PLEIADES_M45_BOUNDS.decMin)) * plotHeight;
    lines.push(`      <text x="${number(plotX - 10)}" y="${number(y + 5)}" text-anchor="end">${formatDecLabel(dec)}</text>`);
    lines.push(`      <text x="${number(plotX + plotWidth + 10)}" y="${number(y + 5)}" text-anchor="start">${formatDecLabel(dec)}</text>`);
  }

  lines.push('    </g>');
  return lines.join('\n');
}

function renderPleiadesStars(stars) {
  const lines = ['    <g id="pleiades-m45-stars" clip-path="url(#pleiades-m45-clip)">'];
  const sortedStars = [...stars].sort((a, b) => b.mag - a.mag);

  for (const star of sortedStars) {
    const point = pointForPleiadesStar(star);
    const radius = pleiadesStarRadius(star);
    const strokeWidth = Math.max(0.08, Math.min(0.18, radius * 0.14));
    const nameAttribute = star.proper ? ` data-name="${escapeXml(star.proper)}"` : '';
    lines.push(
      `      <circle id="pleiades-m45-star-${star.id}"${nameAttribute} cx="${number(point.x)}" cy="${number(point.y)}" r="${number(radius)}" fill="${colorForStar(star)}" stroke="${PRINT_CHART.background}" stroke-width="${number(strokeWidth)}" />`,
    );
  }

  lines.push('    </g>');
  return lines.join('\n');
}

function renderPleiadesStarLabels(stars) {
  const labelStars = stars.filter((star) => star.proper || star.mag <= 4.3);
  const lines = [
    `    <g id="pleiades-m45-star-labels" fill="${PRINT_CHART.text}" font-family="Arial, Helvetica, sans-serif" font-size="11">`,
  ];

  for (const star of labelStars) {
    const point = pointForPleiadesStar(star);
    const radius = pleiadesStarRadius(star);
    lines.push(`      <text id="pleiades-m45-label-${star.id}" x="${number(point.x + radius + 4)}" y="${number(point.y - radius - 2)}">${escapeXml(labelForStar(star))}</text>`);
  }

  lines.push('    </g>');
  return lines.join('\n');
}

function renderPleiadesInset(stars = []) {
  const plotX = PLEIADES_INSET.paddingLeft;
  const plotY = PLEIADES_INSET.paddingTop;
  const plotWidth = PLEIADES_INSET.width - PLEIADES_INSET.paddingLeft - PLEIADES_INSET.paddingRight;
  const plotHeight = PLEIADES_INSET.height - PLEIADES_INSET.paddingTop - PLEIADES_INSET.paddingBottom;

  return [
    `  <g id="pleiades-m45-layer" data-layer="Pleiades Cluster M45 inset" transform="translate(${PLEIADES_INSET.x} ${PLEIADES_INSET.y})">`,
    '    <title>Pleiades Cluster (M45) Inset</title>',
    `    <desc>Zoomed Pleiades Cluster chart bounded by RA ${formatRaLabel(PLEIADES_M45_BOUNDS.raMin)} to ${formatRaLabel(PLEIADES_M45_BOUNDS.raMax)} and Dec ${formatDecLabel(PLEIADES_M45_BOUNDS.decMin)} to ${formatDecLabel(PLEIADES_M45_BOUNDS.decMax)}, magnitude &lt;= ${PLEIADES_M45_BOUNDS.magLimit}.</desc>`,
    '    <defs>',
    `      <clipPath id="pleiades-m45-clip"><rect x="${plotX}" y="${plotY}" width="${plotWidth}" height="${plotHeight}" /></clipPath>`,
    '    </defs>',
    `    <rect id="pleiades-m45-background" width="${PLEIADES_INSET.width}" height="${PLEIADES_INSET.height}" fill="${PRINT_CHART.background}" />`,
    `    <text id="pleiades-m45-title" x="${plotX}" y="28" fill="${PRINT_CHART.text}" font-family="Arial, Helvetica, sans-serif" font-size="22">Pleiades Cluster (M45)</text>`,
    `    <text id="pleiades-m45-subtitle" x="${plotX}" y="48" fill="${PRINT_CHART.mutedText}" fill-opacity="${GRID_LABEL_OPACITY}" font-family="Arial, Helvetica, sans-serif" font-size="12">Mag &lt;= ${PLEIADES_M45_BOUNDS.magLimit} / RA ${formatRaLabel(PLEIADES_M45_BOUNDS.raMin)}-${formatRaLabel(PLEIADES_M45_BOUNDS.raMax)} / Dec ${formatDecLabel(PLEIADES_M45_BOUNDS.decMin)}-${formatDecLabel(PLEIADES_M45_BOUNDS.decMax)}</text>`,
    renderPleiadesGrid(),
    renderPleiadesCoordinateLabels(),
    renderPleiadesStars(stars),
    renderPleiadesStarLabels(stars),
    `    <g id="pleiades-m45-frame" fill="none" stroke="${PRINT_CHART.frame}" stroke-width="1.5">`,
    `      <rect x="${plotX}" y="${plotY}" width="${plotWidth}" height="${plotHeight}" />`,
    '    </g>',
    '  </g>',
  ].join('\n');
}

export function renderStarChartSvg(dataset, options = {}) {
  const documentWidth = PRINT_CHART.widthIn * PRINT_CHART.unitsPerIn;
  const documentHeight = PRINT_CHART.heightIn * PRINT_CHART.unitsPerIn;
  const width = DEFAULT_CHART.width;
  const height = DEFAULT_CHART.height;
  const chartX = DEFAULT_CHART.x;
  const chartY = DEFAULT_CHART.y;
  const padding = DEFAULT_CHART.padding;
  const brightStars = dataset.stars.filter((star) => star.mag <= 4.2);
  const dimStars = dataset.stars.filter((star) => star.mag > 4.2);
  const labels = dataset.stars.filter(shouldLabelStar);
  const parts = [];

  if (options.xmlDeclaration) parts.push('<?xml version="1.0" encoding="UTF-8"?>');

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_CHART.widthIn}in" height="${PRINT_CHART.heightIn}in" viewBox="0 0 ${documentWidth} ${documentHeight}" role="img" aria-label="HYG v4.2 all-sky star chart">`,
    '  <title>HYG Star Chart</title>',
    `  <desc>HYG v4.2 star chart, magnitude &lt;= ${dataset.magLimit}, generated for Illustrator editing. The lower 24 x 12 inch portion contains the equirectangular chart; the upper right contains a separate Pleiades Cluster M45 inset layer to magnitude ${PLEIADES_M45_BOUNDS.magLimit}.</desc>`,
    '  <g id="background">',
    `    <rect width="${documentWidth}" height="${documentHeight}" fill="${PRINT_CHART.background}" />`,
    '  </g>',
    '  <g id="top-data-area" data-purpose="Reserved for additional data and smaller charts">',
    `    <rect x="0" y="0" width="${documentWidth}" height="${chartY}" fill="none" />`,
    '  </g>',
    renderPleiadesInset(options.pleiadesStars),
    `  <g id="equirectangular-star-chart" transform="translate(${chartX} ${chartY})">`,
    '  <g id="chart-background">',
    `    <rect width="${width}" height="${height}" fill="${PRINT_CHART.background}" />`,
    '  </g>',
    renderGrid(width, height, padding),
    renderGridLabels(width, height, padding),
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
    '  </g>',
    '</svg>',
    '',
  );

  return {
    svg: parts.join('\n'),
    labelCount: labels.length,
  };
}
