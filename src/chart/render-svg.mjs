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
  DEFAULT_MAG_LIMIT,
  DIM_STAR_OPACITY,
  escapeXml,
  GRID_LABEL_OPACITY,
  GRID_OPACITY,
  labelForStar,
  MAGNITUDE_SCALE_TICKS,
  MIN_STAR_RADIUS,
  pointForStar,
  PRINT_CHART,
  shouldLabelStar,
  starRadius,
  starRadiusForMagnitude,
} from './chart-model.mjs';

const ILLUSTRATOR_PX_PER_IN = 72;
const TARGET_MIN_STAR_DIAMETER_PX = 0.75;
const SVG_USER_UNITS_PER_ILLUSTRATOR_PX = PRINT_CHART.unitsPerIn / ILLUSTRATOR_PX_PER_IN;
const SVG_MIN_STAR_RADIUS = (TARGET_MIN_STAR_DIAMETER_PX / 2) * SVG_USER_UNITS_PER_ILLUSTRATOR_PX;
const SVG_RADIUS_SCALE = SVG_MIN_STAR_RADIUS / MIN_STAR_RADIUS;
export const PLEIADES_M45_BOUNDS = {
  raMin: 3 + 40 / 60,
  raMax: 3 + 55 / 60,
  decMin: 22,
  decMax: 26,
  magLimit: 12,
};

export const SCORPIO_BOUNDS = {
  raMin: 15 + 40 / 60,
  raMax: 18,
  decMin: -50,
  decMax: -15,
  magLimit: 7.5,
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

const SCORPIO_INSET = {
  x: 70,
  y: 70,
  width: 720,
  height: 720,
  paddingLeft: 76,
  paddingRight: 36,
  paddingTop: 78,
  paddingBottom: 66,
};

export const MAIN_STAR_CHART_ID = 'main';

export const INSET_STAR_CHARTS = {
  scorpio: {
    id: 'scorpio',
    aliases: ['scorpius'],
    title: 'Scorpio',
    layerName: 'Scorpio Gaia DR3 inset',
    outputFileName: 'scorpio-inset.svg',
    bounds: SCORPIO_BOUNDS,
    inset: SCORPIO_INSET,
  },
  pleiades: {
    id: 'pleiades',
    aliases: ['pleiades-m45', 'm45'],
    title: 'Pleiades Cluster (M45)',
    layerName: 'Pleiades Cluster M45 inset',
    outputFileName: 'pleiades-m45-inset.svg',
    bounds: PLEIADES_M45_BOUNDS,
    inset: PLEIADES_INSET,
  },
};

export const STAR_CHART_IDS = [
  MAIN_STAR_CHART_ID,
  ...Object.keys(INSET_STAR_CHARTS),
];

export function normalizeStarChartId(chartId) {
  const normalized = String(chartId ?? MAIN_STAR_CHART_ID).trim().toLowerCase();
  if (normalized === MAIN_STAR_CHART_ID) return MAIN_STAR_CHART_ID;

  for (const chart of Object.values(INSET_STAR_CHARTS)) {
    if (normalized === chart.id || chart.aliases.includes(normalized)) return chart.id;
  }

  return null;
}

export function getInsetStarChart(chartId) {
  const normalized = normalizeStarChartId(chartId);
  return normalized ? INSET_STAR_CHARTS[normalized] ?? null : null;
}

function number(value) {
  return Math.round(value * 100) / 100;
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

function renderMagnitudeScale(width, height, padding) {
  const scaleWidth = 520;
  const xStart = width - padding - scaleWidth;
  const xEnd = width - padding;
  const y = height - 22;
  const labelY = y + 14;
  const titleX = xStart - 168;
  const radiusForMagnitude = (magnitude) => {
    const brightScale = magnitude <= 4.2 ? 1.05 : 1;
    return starRadiusForMagnitude(magnitude) * brightScale * SVG_RADIUS_SCALE;
  };
  const lines = [
    `  <g id="magnitude-scale" font-family="Arial, Helvetica, sans-serif">`,
    `    <text x="${number(titleX)}" y="${number(y + 5)}" fill="${PRINT_CHART.text}" fill-opacity="0.9" font-size="14" font-weight="700">visual magnitude</text>`,
    `    <line x1="${number(xStart)}" y1="${number(y)}" x2="${number(xEnd)}" y2="${number(y)}" stroke="${PRINT_CHART.mutedText}" stroke-opacity="0.42" stroke-width="1" />`,
  ];

  for (const magnitude of MAGNITUDE_SCALE_TICKS) {
    const x = xStart + ((magnitude + 1) / (DEFAULT_MAG_LIMIT + 1)) * scaleWidth;
    const radius = radiusForMagnitude(magnitude);
    const strokeWidth = Math.max(0.08, Math.min(0.18, radius * 0.14));
    lines.push(
      `    <circle cx="${number(x)}" cy="${number(y)}" r="${number(radius)}" fill="${colorForStar({ mag: magnitude })}" stroke="${PRINT_CHART.background}" stroke-width="${number(strokeWidth)}" />`,
    );
    lines.push(`    <text x="${number(x)}" y="${number(labelY)}" fill="${PRINT_CHART.mutedText}" fill-opacity="0.78" font-size="10" text-anchor="middle">${magnitude}</text>`);
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
  const totalMinutes = Math.round(absolute * 60);
  const degrees = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${sign}${degrees} deg ${String(minutes).padStart(2, '0')}'`;
}

function ceilToStep(value, step) {
  return Math.ceil((value - 1e-9) / step) * step;
}

function floorToStep(value, step) {
  return Math.floor((value + 1e-9) / step) * step;
}

function pointForInsetStar(star, inset, bounds) {
  const plotWidth = inset.width - inset.paddingLeft - inset.paddingRight;
  const plotHeight = inset.height - inset.paddingTop - inset.paddingBottom;
  return {
    x: inset.paddingLeft + ((bounds.raMax - star.ra) / (bounds.raMax - bounds.raMin)) * plotWidth,
    y: inset.paddingTop + ((bounds.decMax - star.dec) / (bounds.decMax - bounds.decMin)) * plotHeight,
  };
}

function createInsetMagnitudeRange(stars, bounds) {
  if (!stars.length) {
    return {
      brightMagnitude: 0,
      dimMagnitude: bounds.magLimit,
    };
  }

  let brightMagnitude = Infinity;
  let dimMagnitude = -Infinity;
  for (const star of stars) {
    brightMagnitude = Math.min(brightMagnitude, star.mag);
    dimMagnitude = Math.max(dimMagnitude, star.mag);
  }

  return {
    brightMagnitude,
    dimMagnitude,
  };
}

function insetStarRadius(star, magnitudeRange) {
  const minRadius = 0.75;
  const maxRadius = 9;
  const magnitudeSpan = Math.max(0.01, magnitudeRange.dimMagnitude - magnitudeRange.brightMagnitude);
  const brightness = Math.min(1, Math.max(0, (magnitudeRange.dimMagnitude - star.mag) / magnitudeSpan));
  return minRadius * (maxRadius / minRadius) ** brightness;
}

function renderInsetGrid(idPrefix, inset, bounds) {
  const plotX = inset.paddingLeft;
  const plotY = inset.paddingTop;
  const plotWidth = inset.width - inset.paddingLeft - inset.paddingRight;
  const plotHeight = inset.height - inset.paddingTop - inset.paddingBottom;
  const lines = [
    `    <g id="${idPrefix}-grid" stroke="${PRINT_CHART.grid}" stroke-width="1">`,
  ];

  const raTickStepHours = 5 / 60;
  const firstRaTick = ceilToStep(bounds.raMin, raTickStepHours);
  const lastRaTick = floorToStep(bounds.raMax, raTickStepHours);
  for (let ra = firstRaTick; ra <= lastRaTick + 1e-9; ra += raTickStepHours) {
    const x = plotX + ((bounds.raMax - ra) / (bounds.raMax - bounds.raMin)) * plotWidth;
    const opacity = Math.round(ra * 60) % 10 === 0 ? GRID_OPACITY : 0.24;
    lines.push(`      <line x1="${number(x)}" y1="${plotY}" x2="${number(x)}" y2="${number(plotY + plotHeight)}" stroke-opacity="${opacity}" />`);
  }

  const decTickStep = 10 / 60;
  const firstDecTick = ceilToStep(bounds.decMin, decTickStep);
  const lastDecTick = floorToStep(bounds.decMax, decTickStep);
  for (let dec = firstDecTick; dec <= lastDecTick + 1e-9; dec += decTickStep) {
    const y = plotY + ((bounds.decMax - dec) / (bounds.decMax - bounds.decMin)) * plotHeight;
    const opacity = Math.round(dec * 60) % 60 === 0 ? GRID_OPACITY : 0.18;
    lines.push(`      <line x1="${plotX}" y1="${number(y)}" x2="${number(plotX + plotWidth)}" y2="${number(y)}" stroke-opacity="${opacity}" />`);
  }

  lines.push('    </g>');
  lines.push(`    <g id="${idPrefix}-ra-5-minute-ticks" stroke="${PRINT_CHART.grid}" stroke-opacity="0.55" stroke-width="1">`);

  const smallRaTickStepHours = 5 / 60;
  const firstSmallRaTick = ceilToStep(bounds.raMin, smallRaTickStepHours);
  const lastSmallRaTick = floorToStep(bounds.raMax, smallRaTickStepHours);
  for (let ra = firstSmallRaTick; ra <= lastSmallRaTick + 1e-9; ra += smallRaTickStepHours) {
    const x = plotX + ((bounds.raMax - ra) / (bounds.raMax - bounds.raMin)) * plotWidth;
    const isMajorTick = Math.round(ra * 60) % 10 === 0;
    const tickLength = isMajorTick ? 12 : 7;
    lines.push(`      <line x1="${number(x)}" y1="${plotY}" x2="${number(x)}" y2="${number(plotY + tickLength)}" />`);
    lines.push(`      <line x1="${number(x)}" y1="${number(plotY + plotHeight)}" x2="${number(x)}" y2="${number(plotY + plotHeight - tickLength)}" />`);
  }

  lines.push('    </g>');
  return lines.join('\n');
}

function renderInsetCoordinateLabels(idPrefix, inset, bounds) {
  const plotX = inset.paddingLeft;
  const plotY = inset.paddingTop;
  const plotWidth = inset.width - inset.paddingLeft - inset.paddingRight;
  const plotHeight = inset.height - inset.paddingTop - inset.paddingBottom;
  const lines = [
    `    <g id="${idPrefix}-coordinate-labels" fill="${PRINT_CHART.mutedText}" fill-opacity="${GRID_LABEL_OPACITY}" font-family="Arial, Helvetica, sans-serif" font-size="13">`,
  ];

  const raTickStepHours = 10 / 60;
  const firstRaTick = ceilToStep(bounds.raMin, raTickStepHours);
  const lastRaTick = floorToStep(bounds.raMax, raTickStepHours);
  for (let ra = firstRaTick; ra <= lastRaTick + 1e-9; ra += raTickStepHours) {
    const x = plotX + ((bounds.raMax - ra) / (bounds.raMax - bounds.raMin)) * plotWidth;
    lines.push(`      <text x="${number(x)}" y="${number(plotY - 10)}" text-anchor="middle">${formatRaLabel(ra)}</text>`);
    lines.push(`      <text x="${number(x)}" y="${number(plotY + plotHeight + 25)}" text-anchor="middle">${formatRaLabel(ra)}</text>`);
  }

  const decLabelStep = 2;
  const firstDecLabel = ceilToStep(bounds.decMin, decLabelStep);
  const lastDecLabel = floorToStep(bounds.decMax, decLabelStep);
  for (let dec = firstDecLabel; dec <= lastDecLabel + 1e-9; dec += decLabelStep) {
    const y = plotY + ((bounds.decMax - dec) / (bounds.decMax - bounds.decMin)) * plotHeight;
    lines.push(`      <text x="${number(plotX - 10)}" y="${number(y + 5)}" text-anchor="end">${formatDecLabel(dec)}</text>`);
    lines.push(`      <text x="${number(plotX + plotWidth + 10)}" y="${number(y + 5)}" text-anchor="start">${formatDecLabel(dec)}</text>`);
  }

  lines.push('    </g>');
  return lines.join('\n');
}

function renderInsetStars(idPrefix, stars, magnitudeRange, inset, bounds) {
  const lines = [`    <g id="${idPrefix}-stars" clip-path="url(#${idPrefix}-clip)">`];
  const sortedStars = [...stars].sort((a, b) => b.mag - a.mag);

  for (const star of sortedStars) {
    const point = pointForInsetStar(star, inset, bounds);
    const radius = insetStarRadius(star, magnitudeRange);
    const strokeWidth = Math.max(0.08, Math.min(0.18, radius * 0.14));
    const nameAttribute = star.proper ? ` data-name="${escapeXml(star.proper)}"` : '';
    lines.push(
      `      <circle id="${idPrefix}-star-${star.id}"${nameAttribute} cx="${number(point.x)}" cy="${number(point.y)}" r="${number(radius)}" fill="${colorForStar(star)}" stroke="${PRINT_CHART.background}" stroke-width="${number(strokeWidth)}" />`,
    );
  }

  lines.push('    </g>');
  return lines.join('\n');
}

function renderInsetStarLabels(idPrefix, stars, magnitudeRange, inset, bounds) {
  const labelStars = stars.filter((star) => star.proper || star.mag <= 4.3);
  const lines = [
    `    <g id="${idPrefix}-star-labels" fill="${PRINT_CHART.text}" font-family="Arial, Helvetica, sans-serif" font-size="11">`,
  ];

  for (const star of labelStars) {
    const point = pointForInsetStar(star, inset, bounds);
    const radius = insetStarRadius(star, magnitudeRange);
    lines.push(`      <text id="${idPrefix}-label-${star.id}" x="${number(point.x + radius + 4)}" y="${number(point.y - radius - 2)}">${escapeXml(labelForStar(star))}</text>`);
  }

  lines.push('    </g>');
  return lines.join('\n');
}

function renderGaiaInset({ idPrefix, layerName, title, inset, bounds, stars = [] }) {
  const plotX = inset.paddingLeft;
  const plotY = inset.paddingTop;
  const plotWidth = inset.width - inset.paddingLeft - inset.paddingRight;
  const plotHeight = inset.height - inset.paddingTop - inset.paddingBottom;
  const magnitudeRange = createInsetMagnitudeRange(stars, bounds);

  return [
    `  <g id="${idPrefix}-layer" data-layer="${escapeXml(layerName)}" transform="translate(${inset.x} ${inset.y})">`,
    `    <title>${escapeXml(title)} Inset</title>`,
    `    <desc>${escapeXml(title)} chart using Gaia DR3 sources, bounded by RA ${formatRaLabel(bounds.raMin)} to ${formatRaLabel(bounds.raMax)} and Dec ${formatDecLabel(bounds.decMin)} to ${formatDecLabel(bounds.decMax)}, Gaia G &lt;= ${bounds.magLimit}.</desc>`,
    '    <defs>',
    `      <clipPath id="${idPrefix}-clip"><rect x="${plotX}" y="${plotY}" width="${plotWidth}" height="${plotHeight}" /></clipPath>`,
    '    </defs>',
    `    <rect id="${idPrefix}-background" width="${inset.width}" height="${inset.height}" fill="${PRINT_CHART.background}" />`,
    `    <text id="${idPrefix}-title" x="${plotX}" y="28" fill="${PRINT_CHART.text}" font-family="Arial, Helvetica, sans-serif" font-size="22">${escapeXml(title)}</text>`,
    `    <text id="${idPrefix}-subtitle" x="${plotX}" y="48" fill="${PRINT_CHART.mutedText}" fill-opacity="${GRID_LABEL_OPACITY}" font-family="Arial, Helvetica, sans-serif" font-size="12">Gaia G &lt;= ${bounds.magLimit} / RA ${formatRaLabel(bounds.raMin)} to ${formatRaLabel(bounds.raMax)} / Dec ${formatDecLabel(bounds.decMin)} to ${formatDecLabel(bounds.decMax)}</text>`,
    renderInsetGrid(idPrefix, inset, bounds),
    renderInsetCoordinateLabels(idPrefix, inset, bounds),
    renderInsetStars(idPrefix, stars, magnitudeRange, inset, bounds),
    renderInsetStarLabels(idPrefix, stars, magnitudeRange, inset, bounds),
    `    <g id="${idPrefix}-frame" fill="none" stroke="${PRINT_CHART.frame}" stroke-width="1.5">`,
    `      <rect x="${plotX}" y="${plotY}" width="${plotWidth}" height="${plotHeight}" />`,
    '    </g>',
    '  </g>',
  ].join('\n');
}

function renderSvgDocument({ widthIn, heightIn, title, desc, ariaLabel, xmlDeclaration = false, parts }) {
  const documentWidth = widthIn * PRINT_CHART.unitsPerIn;
  const documentHeight = heightIn * PRINT_CHART.unitsPerIn;
  const lines = [];

  if (xmlDeclaration) lines.push('<?xml version="1.0" encoding="UTF-8"?>');

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthIn}in" height="${heightIn}in" viewBox="0 0 ${documentWidth} ${documentHeight}" role="img" aria-label="${escapeXml(ariaLabel)}">`,
    `  <title>${escapeXml(title)}</title>`,
    `  <desc>${escapeXml(desc)}</desc>`,
    ...parts,
    '</svg>',
    '',
  );

  return lines.join('\n');
}

function renderMainStarChartLayer(dataset, { chartX = 0, chartY = 0 } = {}) {
  const width = DEFAULT_CHART.width;
  const height = DEFAULT_CHART.height;
  const padding = DEFAULT_CHART.padding;
  const brightStars = dataset.stars.filter((star) => star.mag <= 4.2);
  const dimStars = dataset.stars.filter((star) => star.mag > 4.2);
  const labels = dataset.stars.filter(shouldLabelStar);
  const transform = chartX || chartY ? ` transform="translate(${chartX} ${chartY})"` : '';
  const parts = [
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
    renderMagnitudeScale(width, height, padding),
    '  </g>',
  ];

  parts[0] = `  <g id="equirectangular-star-chart"${transform}>`;

  return {
    svg: parts.join('\n'),
    labelCount: labels.length,
  };
}

export function renderMainStarChartSvg(dataset, options = {}) {
  const { svg, labelCount } = renderMainStarChartLayer(dataset);

  return {
    svg: renderSvgDocument({
      widthIn: PRINT_CHART.chartWidthIn,
      heightIn: PRINT_CHART.chartHeightIn,
      title: 'HYG Star Chart',
      ariaLabel: 'HYG v4.2 all-sky star chart',
      desc: `HYG v4.2 equirectangular all-sky star chart, magnitude <= ${dataset.magLimit}, generated for Illustrator editing.`,
      xmlDeclaration: options.xmlDeclaration,
      parts: [svg],
    }),
    labelCount,
  };
}

export function renderInsetStarChartSvg(chartId, stars = [], options = {}) {
  const chart = getInsetStarChart(chartId);
  if (!chart) {
    throw new Error(`Unknown inset star chart "${chartId}". Use one of: ${Object.keys(INSET_STAR_CHARTS).join(', ')}.`);
  }

  const inset = {
    ...chart.inset,
    x: 0,
    y: 0,
  };

  return {
    svg: renderSvgDocument({
      widthIn: inset.width / PRINT_CHART.unitsPerIn,
      heightIn: inset.height / PRINT_CHART.unitsPerIn,
      title: `${chart.title} Inset`,
      ariaLabel: `${chart.title} inset star chart`,
      desc: `${chart.title} chart using Gaia DR3 sources, bounded by RA ${formatRaLabel(chart.bounds.raMin)} to ${formatRaLabel(chart.bounds.raMax)} and Dec ${formatDecLabel(chart.bounds.decMin)} to ${formatDecLabel(chart.bounds.decMax)}, Gaia G <= ${chart.bounds.magLimit}.`,
      xmlDeclaration: options.xmlDeclaration,
      parts: [
        renderGaiaInset({
          idPrefix: chart.id === 'pleiades' ? 'pleiades-m45' : chart.id,
          layerName: chart.layerName,
          title: chart.title,
          inset,
          bounds: chart.bounds,
          stars,
        }),
      ],
    }),
    starCount: stars.length,
  };
}

export function renderCompositeStarChartSvg(dataset, options = {}) {
  const documentWidth = PRINT_CHART.widthIn * PRINT_CHART.unitsPerIn;
  const chartY = DEFAULT_CHART.y;
  const { svg: mainChartSvg, labelCount } = renderMainStarChartLayer(dataset, {
    chartX: DEFAULT_CHART.x,
    chartY: DEFAULT_CHART.y,
  });

  return {
    svg: renderSvgDocument({
      widthIn: PRINT_CHART.widthIn,
      heightIn: PRINT_CHART.heightIn,
      title: 'HYG Star Chart',
      ariaLabel: 'HYG v4.2 all-sky star chart',
      desc: `HYG v4.2 star chart, magnitude <= ${dataset.magLimit}, generated for Illustrator editing. The lower 24 x 12 inch portion contains the equirectangular chart; the upper area contains separate Gaia DR3 inset layers for Scorpio and the Pleiades Cluster M45.`,
      xmlDeclaration: options.xmlDeclaration,
      parts: [
        '  <g id="background">',
        `    <rect width="${documentWidth}" height="${PRINT_CHART.heightIn * PRINT_CHART.unitsPerIn}" fill="${PRINT_CHART.background}" />`,
        '  </g>',
        '  <g id="top-data-area" data-purpose="Reserved for additional data and smaller charts">',
        `    <rect x="0" y="0" width="${documentWidth}" height="${chartY}" fill="none" />`,
        '  </g>',
        renderGaiaInset({
          idPrefix: 'scorpio',
          layerName: INSET_STAR_CHARTS.scorpio.layerName,
          title: INSET_STAR_CHARTS.scorpio.title,
          inset: INSET_STAR_CHARTS.scorpio.inset,
          bounds: INSET_STAR_CHARTS.scorpio.bounds,
          stars: options.scorpioStars,
        }),
        renderGaiaInset({
          idPrefix: 'pleiades-m45',
          layerName: INSET_STAR_CHARTS.pleiades.layerName,
          title: INSET_STAR_CHARTS.pleiades.title,
          inset: INSET_STAR_CHARTS.pleiades.inset,
          bounds: INSET_STAR_CHARTS.pleiades.bounds,
          stars: options.pleiadesStars,
        }),
        mainChartSvg,
      ],
    }),
    labelCount,
  };
}

export function renderStarChartSvg(dataset, options = {}) {
  if (options.chartId || options.chart) {
    const chartId = normalizeStarChartId(options.chartId ?? options.chart);
    if (chartId === MAIN_STAR_CHART_ID) return renderMainStarChartSvg(dataset, options);
  }

  return renderCompositeStarChartSvg(dataset, options);
}
