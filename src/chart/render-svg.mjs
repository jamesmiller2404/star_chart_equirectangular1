import {
  colorForStar,
  createDecTickMarks,
  createDecTicks,
  createRaMinuteTicks,
  createRaTicks,
  DEFAULT_CHART,
  escapeXml,
  labelForStar,
  pointForStar,
  PRINT_CHART,
  shouldLabelStar,
  starOpacity,
  starRadius,
} from './chart-model.mjs';

function number(value) {
  return Math.round(value * 100) / 100;
}

function renderGrid(width, height, padding) {
  const lines = [
    `  <g id="grid" stroke="${PRINT_CHART.grid}" stroke-opacity="0.62" stroke-width="1" fill="${PRINT_CHART.mutedText}" font-family="Arial, Helvetica, sans-serif" font-size="18">`,
  ];

  for (const tick of createRaMinuteTicks(5)) {
    if (tick.isHour) continue;
    const x = padding + ((24 - tick.hour) / 24) * (width - padding * 2);
    const tickLength = tick.isMedium ? 18 : 9;
    const opacity = tick.isMedium ? 0.48 : 0.3;
    lines.push(`    <line x1="${number(x)}" y1="${padding}" x2="${number(x)}" y2="${padding + tickLength}" stroke-opacity="${opacity}" />`);
    lines.push(`    <line x1="${number(x)}" y1="${height - padding}" x2="${number(x)}" y2="${height - padding - tickLength}" stroke-opacity="${opacity}" />`);
  }

  for (const hour of createRaTicks(1)) {
    const x = padding + ((24 - hour) / 24) * (width - padding * 2);
    lines.push(`    <line x1="${number(x)}" y1="${padding}" x2="${number(x)}" y2="${height - padding}" stroke-opacity="0.62" />`);
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
    lines.push(`    <line x1="${padding}" y1="${number(y)}" x2="${width - padding}" y2="${number(y)}" stroke-opacity="0.62" />`);
    lines.push(`    <text x="${padding - 12}" y="${number(y + 6)}" text-anchor="end">${dec > 0 ? '+' : ''}${dec}</text>`);
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderStars(id, stars, scale) {
  const lines = [`  <g id="${id}">`];

  for (const star of stars) {
    const point = pointForStar(star);
    lines.push(
      `    <circle id="star-${star.id}" cx="${number(point.x)}" cy="${number(point.y)}" r="${number(starRadius(star, scale))}" fill="${colorForStar(star)}" opacity="${number(starOpacity(star))}" />`,
    );
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
    renderStars('stars-dim', dimStars, 1),
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
