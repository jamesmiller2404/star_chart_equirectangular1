import fs from 'node:fs';
import { CONSTELLATION_BOUNDARIES } from './constellation-boundaries-data.mjs';
import {
  BRIGHT_STAR_MAGNITUDE_LIMIT,
  colorForStar,
  CONSTELLATION_BOUNDARY_OPACITY,
  CONSTELLATION_BOUNDARY_WIDTH_PT,
  CONSTELLATION_LINE_OPACITY,
  CONSTELLATION_LINE_WIDTH_PT,
  CONSTELLATION_LABEL_OPACITY,
  createEclipticCoordinates,
  createHipStarMap,
  createRaMinuteTicks,
  createRaTicks,
  DEFAULT_CHART,
  DEFAULT_MAG_LIMIT,
  DIM_STAR_OPACITY,
  bayerGreekLetterForStar,
  escapeXml,
  GRID_LABEL_OPACITY,
  GRID_OPACITY,
  labelForStar,
  MAGNITUDE_SCALE_TICKS,
  MIN_STAR_RADIUS,
  pointForCoordinates,
  PRINT_CHART,
  renderedStarRadiusScaleForMagnitude,
  shouldLabelBayerStar,
  shouldLabelStar,
  starRadius,
  starRadiusForMagnitude,
} from './chart-model.mjs';

const ILLUSTRATOR_PX_PER_IN = 72;
const TARGET_MIN_STAR_DIAMETER_PX = 0.75;
const POLAR_TARGET_MIN_STAR_DIAMETER_PX = 1.1;
const SVG_USER_UNITS_PER_ILLUSTRATOR_PX = PRINT_CHART.unitsPerIn / ILLUSTRATOR_PX_PER_IN;
const SVG_MIN_STAR_RADIUS = (TARGET_MIN_STAR_DIAMETER_PX / 2) * SVG_USER_UNITS_PER_ILLUSTRATOR_PX;
const SVG_RADIUS_SCALE = SVG_MIN_STAR_RADIUS / MIN_STAR_RADIUS;
const POLAR_SVG_MIN_STAR_RADIUS = (POLAR_TARGET_MIN_STAR_DIAMETER_PX / 2) * SVG_USER_UNITS_PER_ILLUSTRATOR_PX;
const POLAR_SVG_RADIUS_SCALE = POLAR_SVG_MIN_STAR_RADIUS / MIN_STAR_RADIUS;
const POLAR_DIM_STAR_RADIUS_SCALE = 1.4;
const POLAR_BRIGHT_STAR_RADIUS_ENHANCEMENT = 1.35;
const STAR_LABEL_TIGHTEN_AXIS_PX = Math.sqrt(9.5);
const illustratorPointSize = (points) => Number((points * SVG_USER_UNITS_PER_ILLUSTRATOR_PX).toFixed(3));
const STAR_NAME_LABEL_FONT_FAMILY = "'Alegreya Sans Thin', 'Alegreya Sans', sans-serif";
const STAR_NAME_LABEL_FONT_SIZE = illustratorPointSize(5.6);
const STAR_NAME_LABEL_FILL = '#ffffff';
const BAYER_LABEL_FONT_FAMILY = "'Minion Pro', serif";
const BAYER_LABEL_FONT_SIZE = illustratorPointSize(5.6);
const BAYER_LABEL_FILL = '#ffffff';
const RA_DEC_LABEL_FONT_FAMILY = "'Cinzel Medium', Cinzel, serif";
const RA_DEC_LABEL_FONT_SIZE = illustratorPointSize(10);
const RA_DEC_LABEL_FONT_WEIGHT = 500;
const RA_DEC_LABEL_FILL = '#ffffff';
const MAIN_RA_TOP_LABEL_OFFSET_PX = 8;
const MAIN_RA_BOTTOM_LABEL_OFFSET_PX = 18;
const MAIN_DEC_LABEL_OFFSET_PX = 7;
const CONSTELLATION_LABEL_FONT_FAMILY = "Garamond, serif";
const CONSTELLATION_LABEL_FONT_SIZE = illustratorPointSize(5.6);
const CONSTELLATION_LABEL_FILL = '#ffffff';
const MAIN_STAR_LABEL_X_OFFSET = (9 - STAR_LABEL_TIGHTEN_AXIS_PX) / 2;
const MAIN_STAR_LABEL_Y_OFFSET = (-7 + STAR_LABEL_TIGHTEN_AXIS_PX) / 2;
const POLAR_STAR_LABEL_X_OFFSET = (8 - STAR_LABEL_TIGHTEN_AXIS_PX) / 2;
const POLAR_STAR_LABEL_Y_OFFSET = (-6 + STAR_LABEL_TIGHTEN_AXIS_PX) / 2;
const MAIN_CHART_PLOT_CLIP_ID = 'main-chart-plot-clip';
const POLAR_CHART_PLOT_CLIP_ID = 'polar-chart-plot-clip';
const POLAR_CHART = {
  widthIn: 12,
  heightIn: 12,
  padding: 90,
};
const POLAR_CLEAN_INNER_DECLINATION = 85;
const POLAR_OUTER_FRAME_RADIUS_SCALE = 1.02;
const POLAR_OUTER_FRAME_OPACITY = 0.65;
const POLAR_OUTER_FRAME_WIDTH_PT = 1.2;
const POLAR_RA_FRAME_TICK_STEP_MINUTES = 5;
const POLAR_RA_FRAME_MAJOR_TICK_MINUTES = new Set([20, 40]);
const POLAR_RA_FRAME_MINOR_TICK_WIDTH_RATIO = 0.5;
const POLAR_DEC_TICK_STEP_DEGREES = 1;
const POLAR_DEC_MAJOR_TICK_STEP_DEGREES = 5;
const POLAR_DEC_LABEL_STEP_DEGREES = 10;
const POLAR_DEC_MINOR_TICK_LENGTH = 8;
const POLAR_DEC_MAJOR_TICK_LENGTH = 14;
const POLAR_NORTH_DEC_LABEL_X_OFFSET = -5;
const POLAR_NORTH_DEC_AXIS_TICK_MAX = 84;
const POLAR_SOUTH_DEC_LABEL_X_OFFSET = 5;
const POLAR_SOUTH_DEC_AXIS_TICK_MIN = -84;
const POLAR_CHART_RADIUS = (Math.min(POLAR_CHART.widthIn, POLAR_CHART.heightIn) * PRINT_CHART.unitsPerIn) / 2 - POLAR_CHART.padding;
const POLAR_RA_FRAME_TICK_BAND_WIDTH = POLAR_CHART_RADIUS * (POLAR_OUTER_FRAME_RADIUS_SCALE - 1);
const MAIN_RA_MINOR_TICK_LENGTH = POLAR_RA_FRAME_TICK_BAND_WIDTH * POLAR_RA_FRAME_MINOR_TICK_WIDTH_RATIO;
const MAIN_RA_MEDIUM_TICK_LENGTH = POLAR_RA_FRAME_TICK_BAND_WIDTH;
const MAIN_INNER_BORDER_INSET = POLAR_RA_FRAME_TICK_BAND_WIDTH;
const D3_CELESTIAL_MILKY_WAY = JSON.parse(fs.readFileSync(new URL('../../data/milky-way/d3-celestial-mw.json', import.meta.url), 'utf8'));
const MILKY_WAY_LAYER_OPACITY = 0.65;
const MILKY_WAY_FEATURE_OPACITIES = [0.063, 0.077, 0.091, 0.112, 0.14];
const MAIN_CHART_CLUSTER_LABELS = [
  {
    id: 'pleiades',
    label: 'Pleiades',
    ra: 3 + 48 / 60,
    dec: 26.2,
  },
];
export const PLEIADES_M45_BOUNDS = {
  raMin: 3 + 42 / 60,
  raMax: 3 + 54 / 60,
  decMin: 23,
  decMax: 25 + 30 / 60,
  magLimit: 12,
  grid: {
    raStepHours: 2 / 60,
    decStepDegrees: 30 / 60,
  },
  labels: {
    raStepHours: 2 / 60,
    decStepDegrees: 30 / 60,
  },
  ticks: {
    raStepHours: 1 / 300,
    decStepDegrees: 1 / 10,
    minPixelSpacing: 4,
  },
};

export const LYRA_BOUNDS = {
  raMin: 17,
  raMax: 20 + 40 / 60,
  decMin: 20,
  decMax: 50,
  magLimit: 7.5,
  centerRa: 18 + 50 / 60,
  centerDec: 35,
  boundary: {
    type: 'declination-trapezoid',
    bottomRaMin: 17.771222732744608,
    bottomRaMax: 19.895443933922056,
    topRaMin: 17.2685304742529,
    topRaMax: 20.398136192413766,
  },
  grid: {
    raStepHours: 20 / 60,
    decStepDegrees: 5,
  },
  labels: {
    raStepHours: 20 / 60,
    decStepDegrees: 5,
  },
  ticks: {
    raStepHours: 5 / 60,
    decStepDegrees: 1,
    minPixelSpacing: 4,
  },
};

function hasDeclinationTrapezoidBoundary(bounds) {
  return bounds.boundary?.type === 'declination-trapezoid';
}

function boundaryTForDec(bounds, dec) {
  return (dec - bounds.decMin) / (bounds.decMax - bounds.decMin);
}

function interpolateBoundaryValue(start, end, t) {
  return start + (end - start) * t;
}

export function insetRaRangeAtDec(bounds, dec) {
  if (!hasDeclinationTrapezoidBoundary(bounds)) {
    return {
      raMin: bounds.raMin,
      raMax: bounds.raMax,
    };
  }

  const t = boundaryTForDec(bounds, dec);
  return {
    raMin: interpolateBoundaryValue(bounds.boundary.bottomRaMin, bounds.boundary.topRaMin, t),
    raMax: interpolateBoundaryValue(bounds.boundary.bottomRaMax, bounds.boundary.topRaMax, t),
  };
}

export function isCoordinateInsideInsetBounds(bounds, ra, dec, mag = -Infinity) {
  if (mag > bounds.magLimit || dec < bounds.decMin || dec > bounds.decMax) return false;
  const range = insetRaRangeAtDec(bounds, dec);
  return ra >= range.raMin && ra <= range.raMax;
}

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

const LYRA_INSET = {
  x: 810,
  y: 70,
  width: 720,
  height: 720,
  paddingLeft: 76,
  paddingRight: 76,
  paddingTop: 78,
  paddingBottom: 74,
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
export const MAIN_DEC_55_STAR_CHART_ID = 'main-dec-55';

export const MAIN_STAR_CHARTS = {
  [MAIN_STAR_CHART_ID]: {
    id: MAIN_STAR_CHART_ID,
    aliases: ['all-sky'],
    title: 'HYG Star Chart',
    outputFileName: 'hyg-star-chart-main-24x12.svg',
    decMin: -90,
    decMax: 90,
  },
  [MAIN_DEC_55_STAR_CHART_ID]: {
    id: MAIN_DEC_55_STAR_CHART_ID,
    aliases: ['main-55', 'main-limited', 'dec-55', 'dec55'],
    title: 'HYG Star Chart -55 to +55 Dec',
    outputFileName: 'hyg-star-chart-main-dec-55-24x12.svg',
    decMin: -55,
    decMax: 55,
    preserveFullSkyScale: true,
    showBoundaryDecLabels: false,
  },
};

export const POLAR_STAR_CHARTS = {
  'north-polar': {
    id: 'north-polar',
    aliases: ['north', 'northern', 'northern-polar', 'northern-hemisphere'],
    title: 'Northern Polar Star Chart',
    outputFileName: 'hyg-northern-polar-star-chart.svg',
    decMin: 50,
    decMax: 90,
    poleDec: 90,
  },
  'south-polar': {
    id: 'south-polar',
    aliases: ['south', 'southern', 'southern-polar', 'southern-hemisphere'],
    title: 'Southern Polar Star Chart',
    outputFileName: 'hyg-southern-polar-star-chart.svg',
    decMin: -90,
    decMax: -50,
    poleDec: -90,
    mirrorRa: true,
  },
};

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
    projection: 'stereographic',
  },
  lyra: {
    id: 'lyra',
    aliases: ['lyr'],
    title: 'Lyra',
    layerName: 'Lyra Gaia DR3 inset',
    outputFileName: 'lyra-inset.svg',
    bounds: LYRA_BOUNDS,
    inset: LYRA_INSET,
    projection: 'stereographic',
    catalogPriority: 'hyg-gaia',
    sourceLabel: 'HYG v4.2 + Gaia DR3',
  },
};

export const STAR_CHART_IDS = [
  MAIN_STAR_CHART_ID,
  MAIN_DEC_55_STAR_CHART_ID,
  ...Object.keys(POLAR_STAR_CHARTS),
  ...Object.keys(INSET_STAR_CHARTS),
];

export function normalizeStarChartId(chartId) {
  const normalized = String(chartId ?? MAIN_STAR_CHART_ID).trim().toLowerCase();

  for (const chart of Object.values(MAIN_STAR_CHARTS)) {
    if (normalized === chart.id || chart.aliases.includes(normalized)) return chart.id;
  }

  for (const chart of Object.values(POLAR_STAR_CHARTS)) {
    if (normalized === chart.id || chart.aliases.includes(normalized)) return chart.id;
  }

  for (const chart of Object.values(INSET_STAR_CHARTS)) {
    if (normalized === chart.id || chart.aliases.includes(normalized)) return chart.id;
  }

  return null;
}

export function getMainStarChart(chartId) {
  const normalized = normalizeStarChartId(chartId);
  return normalized ? MAIN_STAR_CHARTS[normalized] ?? null : null;
}

export function getInsetStarChart(chartId) {
  const normalized = normalizeStarChartId(chartId);
  return normalized ? INSET_STAR_CHARTS[normalized] ?? null : null;
}

export function getPolarStarChart(chartId) {
  const normalized = normalizeStarChartId(chartId);
  return normalized ? POLAR_STAR_CHARTS[normalized] ?? null : null;
}

function number(value) {
  return Math.round(value * 100) / 100;
}

function raHoursForCelestialLongitude(longitudeDegrees) {
  const normalizedLongitude = longitudeDegrees < 0 ? longitudeDegrees + 360 : longitudeDegrees;
  return normalizedLongitude / 15;
}

function pointForCelestialCoordinate(coordinate, width, height, padding, projection = null) {
  const [longitude, latitude] = coordinate;
  if (projection) return projection.project(raHoursForCelestialLongitude(longitude), latitude);
  return pointForCoordinates(raHoursForCelestialLongitude(longitude), latitude, width, height, padding);
}

function createMainChartProjection(width, height, padding, chart = MAIN_STAR_CHARTS[MAIN_STAR_CHART_ID]) {
  const decMin = chart.decMin ?? -90;
  const decMax = chart.decMax ?? 90;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const preservesFullSkyScale = chart.preserveFullSkyScale ?? (decMin !== -90 || decMax !== 90);
  const sourceDecMin = preservesFullSkyScale ? -90 : decMin;
  const sourceDecMax = preservesFullSkyScale ? 90 : decMax;
  const sourceDecSpan = sourceDecMax - sourceDecMin;
  const croppedPlotHeight = ((decMax - decMin) / sourceDecSpan) * plotHeight;
  const yOffset = preservesFullSkyScale ? (plotHeight - croppedPlotHeight) / 2 : 0;

  return {
    decMin,
    decMax,
    plotTop: padding + yOffset,
    plotBottom: padding + yOffset + croppedPlotHeight,
    plotHeight: croppedPlotHeight,
    isFullSky: decMin === -90 && decMax === 90,
    project(ra, dec) {
      return {
        x: padding + ((24 - ra) / 24) * plotWidth,
        y: padding + yOffset + ((decMax - dec) / (decMax - decMin)) * croppedPlotHeight,
      };
    },
    containsDec(dec) {
      return dec >= decMin && dec <= decMax;
    },
  };
}

function mainPointForStar(star, projection) {
  return projection.project(star.ra, star.dec);
}

function mainDecTicks(step, projection) {
  const ticks = [];
  for (let dec = ceilToStep(projection.decMin, step); dec <= projection.decMax + 1e-9; dec += step) {
    ticks.push(dec);
  }
  return ticks;
}

function mainDecLabelTicks(step, projection) {
  return [...new Set([projection.decMin, ...mainDecTicks(step, projection), projection.decMax])]
    .sort((a, b) => a - b);
}

function unwrapHorizontalPoints(points, plotWidth) {
  if (points.length < 2) return points;

  const unwrappedPoints = [{ ...points[0] }];
  for (let index = 1; index < points.length; index += 1) {
    let x = points[index].x;
    const previousX = unwrappedPoints[index - 1].x;
    while (x - previousX > plotWidth / 2) x -= plotWidth;
    while (previousX - x > plotWidth / 2) x += plotWidth;
    unwrappedPoints.push({
      ...points[index],
      x,
    });
  }

  return unwrappedPoints;
}

function isSamePoint(a, b) {
  return Math.abs(a.x - b.x) < 1e-7 && Math.abs(a.y - b.y) < 1e-7;
}

function rotatePoints(points, startIndex) {
  return [
    ...points.slice(startIndex),
    ...points.slice(0, startIndex),
  ];
}

function largestHorizontalJumpIndex(points) {
  let largestJump = 0;
  let largestJumpIndex = 0;

  for (let index = 1; index < points.length; index += 1) {
    const jump = Math.abs(points[index].x - points[index - 1].x);
    if (jump > largestJump) {
      largestJump = jump;
      largestJumpIndex = index;
    }
  }

  return largestJumpIndex;
}

function unwrapClosedHorizontalRing(points, plotWidth) {
  if (points.length < 3) return unwrapHorizontalPoints(points, plotWidth);

  const openRing = isSamePoint(points[0], points.at(-1)) ? points.slice(0, -1) : points;
  const startIndex = largestHorizontalJumpIndex([
    ...openRing,
    openRing[0],
  ]);
  const rotatedRing = rotatePoints(openRing, startIndex % openRing.length);
  return unwrapHorizontalPoints(rotatedRing, plotWidth);
}

function translatedPoints(points, shiftX) {
  if (!shiftX) return points;
  return points.map((point) => ({
    ...point,
    x: point.x + shiftX,
  }));
}

function pathIntersectsPlotArea(points, padding, plotWidth, plotHeight) {
  const maxPlotX = padding + plotWidth;
  const maxPlotY = padding + plotHeight;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return maxX >= padding && minX <= maxPlotX && maxY >= padding && minY <= maxPlotY;
}

function projectedMilkyWayRing(ring, width, height, padding, projection = null) {
  const plotWidth = width - padding * 2;
  return unwrapClosedHorizontalRing(
    ring.map((coordinate) => pointForCelestialCoordinate(coordinate, width, height, padding, projection)),
    plotWidth,
  );
}

function translatedRings(rings, shiftX) {
  if (!shiftX) return rings;
  return rings.map((ring) => translatedPoints(ring, shiftX));
}

function horizontalCenter(points) {
  if (!points.length) return 0;
  let minX = Infinity;
  let maxX = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
  }

  return (minX + maxX) / 2;
}

function alignRingsToOuterRing(rings, plotWidth) {
  if (rings.length < 2) return rings;

  const outerCenter = horizontalCenter(rings[0]);
  return rings.map((ring, index) => {
    if (index === 0) return ring;

    let shiftX = 0;
    let ringCenter = horizontalCenter(ring);
    while (ringCenter + shiftX - outerCenter > plotWidth / 2) shiftX -= plotWidth;
    while (outerCenter - (ringCenter + shiftX) > plotWidth / 2) shiftX += plotWidth;
    return translatedPoints(ring, shiftX);
  });
}

function polygonIntersectsPlotArea(rings, padding, plotWidth, plotHeight) {
  return rings.some((ring) => pathIntersectsPlotArea(ring, padding, plotWidth, plotHeight));
}

function pathAttributeWithEdgeClosure(points, minX, maxX, minY, maxY) {
  if (!points.length) return '';

  const [firstPoint, ...remainingPoints] = points;
  const lastPoint = points.at(-1);
  let closingPoints = [];

  if (Math.abs(firstPoint.x - lastPoint.x) > (maxX - minX) / 2) {
    const lastEdgeX = lastPoint.x > firstPoint.x ? maxX : minX;
    const firstEdgeX = lastPoint.x > firstPoint.x ? minX : maxX;
    const outsideY = (firstPoint.y + lastPoint.y) / 2 < (minY + maxY) / 2 ? minY - 1 : maxY + 1;
    closingPoints = [
      { x: lastEdgeX, y: lastPoint.y },
      { x: lastEdgeX, y: outsideY },
      { x: firstEdgeX, y: outsideY },
      { x: firstEdgeX, y: firstPoint.y },
    ];
  }

  return [
    `M ${number(firstPoint.x)} ${number(firstPoint.y)}`,
    ...remainingPoints.map((point) => `L ${number(point.x)} ${number(point.y)}`),
    ...closingPoints.map((point) => `L ${number(point.x)} ${number(point.y)}`),
    'Z',
  ].join(' ');
}

function pathForRings(rings, minX, maxX, minY, maxY) {
  return rings.map((ring) => pathAttributeWithEdgeClosure(ring, minX, maxX, minY, maxY)).join(' ');
}

function createMilkyWayFeaturePaths(feature, width, height, padding, projection = null) {
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const minX = padding;
  const maxX = padding + plotWidth;
  const minY = padding;
  const maxY = padding + plotHeight;
  const paths = [];

  if (feature.geometry?.type !== 'MultiPolygon') return paths;

  for (const polygon of feature.geometry.coordinates) {
    const rings = alignRingsToOuterRing(
      polygon.map((ring) => projectedMilkyWayRing(ring, width, height, padding, projection)),
      plotWidth,
    );
    for (const shiftX of [-plotWidth, 0, plotWidth]) {
      const shiftedRings = translatedRings(rings, shiftX);
      if (polygonIntersectsPlotArea(shiftedRings, padding, plotWidth, plotHeight)) {
        paths.push(pathForRings(shiftedRings, minX, maxX, minY, maxY));
      }
    }
  }

  return paths;
}

function renderPlotClipPath(width, height, padding, projection = createMainChartProjection(width, height, padding)) {
  return [
    '  <defs>',
    `    <clipPath id="${MAIN_CHART_PLOT_CLIP_ID}">`,
    `      <rect x="${padding}" y="${number(projection.plotTop)}" width="${width - padding * 2}" height="${number(projection.plotHeight)}" />`,
    '    </clipPath>',
    '  </defs>',
  ].join('\n');
}

function renderMilkyWayLayer(width, height, padding, projection = null) {
  const lines = [
    `  <g id="milky-way-layer" data-layer="Milky Way outline" opacity="${MILKY_WAY_LAYER_OPACITY}" clip-path="url(#${MAIN_CHART_PLOT_CLIP_ID})">`,
    '    <desc>Faint filled Milky Way outlines from d3-celestial data/mw.json; paths are fills only for Illustrator layer editing.</desc>',
  ];

  for (const [featureIndex, feature] of D3_CELESTIAL_MILKY_WAY.features.entries()) {
    const layerId = escapeXml(feature.id ?? `ol${featureIndex + 1}`);
    const opacity = MILKY_WAY_FEATURE_OPACITIES[featureIndex] ?? 0.02;
    const fill = featureIndex >= D3_CELESTIAL_MILKY_WAY.features.length - 2 ? PRINT_CHART.text : PRINT_CHART.mutedText;
    const paths = createMilkyWayFeaturePaths(feature, width, height, padding, projection);

    lines.push(`    <g id="milky-way-${layerId}" data-brightness-step="${layerId}" fill="${fill}" fill-opacity="${opacity}" fill-rule="evenodd">`);
    for (const path of paths) {
      lines.push(`      <path d="${path}" />`);
    }
    lines.push('    </g>');
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderGrid(width, height, padding, projection = createMainChartProjection(width, height, padding)) {
  const lines = [
    `  <g id="grid" stroke="${PRINT_CHART.grid}" stroke-opacity="${GRID_OPACITY}" stroke-width="1">`,
  ];

  for (const tick of createRaMinuteTicks(5)) {
    if (tick.isHour) continue;
    const x = padding + ((24 - tick.hour) / 24) * (width - padding * 2);
    const tickLength = tick.isMedium ? MAIN_RA_MEDIUM_TICK_LENGTH : MAIN_RA_MINOR_TICK_LENGTH;
    const opacity = tick.isMedium ? GRID_OPACITY : 0.3;
    lines.push(`    <line x1="${number(x)}" y1="${number(projection.plotTop)}" x2="${number(x)}" y2="${number(projection.plotTop + tickLength)}" stroke-opacity="${opacity}" />`);
    lines.push(`    <line x1="${number(x)}" y1="${number(projection.plotBottom)}" x2="${number(x)}" y2="${number(projection.plotBottom - tickLength)}" stroke-opacity="${opacity}" />`);
  }

  for (const hour of createRaTicks(1)) {
    const x = padding + ((24 - hour) / 24) * (width - padding * 2);
    lines.push(`    <line x1="${number(x)}" y1="${number(projection.plotTop)}" x2="${number(x)}" y2="${number(projection.plotBottom)}" stroke-opacity="${GRID_OPACITY}" />`);
  }

  for (const dec of mainDecLabelTicks(10, projection)) {
    const y = projection.project(0, dec).y;
    lines.push(`    <line x1="${padding}" y1="${number(y)}" x2="${width - padding}" y2="${number(y)}" stroke-opacity="${GRID_OPACITY}" />`);
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderMainDecAxisTicks(width, padding, projection = createMainChartProjection(width, DEFAULT_CHART.height, padding)) {
  const leftAxisX = padding;
  const rightAxisX = width - padding;
  const lines = [
    `  <g id="main-dec-axis-ticks" fill="none" stroke="${PRINT_CHART.grid}" stroke-opacity="${GRID_LABEL_OPACITY}" stroke-width="1" stroke-linecap="butt">`,
  ];

  for (const dec of mainDecTicks(POLAR_DEC_TICK_STEP_DEGREES, projection)) {
    if (dec === projection.decMin || dec === projection.decMax) continue;
    if (isOnStep(dec, POLAR_DEC_LABEL_STEP_DEGREES)) continue;

    const y = projection.project(0, dec).y;
    const tickLength = isOnStep(dec, POLAR_DEC_MAJOR_TICK_STEP_DEGREES) ? MAIN_RA_MEDIUM_TICK_LENGTH : MAIN_RA_MINOR_TICK_LENGTH;
    lines.push(`    <line x1="${number(leftAxisX)}" y1="${number(y)}" x2="${number(leftAxisX + tickLength)}" y2="${number(y)}" />`);
    lines.push(`    <line x1="${number(rightAxisX)}" y1="${number(y)}" x2="${number(rightAxisX - tickLength)}" y2="${number(y)}" />`);
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderMainInnerBorder(width, padding, projection = createMainChartProjection(width, DEFAULT_CHART.height, padding)) {
  return [
    `  <g id="main-inner-border" fill="none" stroke="${PRINT_CHART.grid}" stroke-opacity="${GRID_OPACITY}" stroke-width="1">`,
    `    <rect x="${number(padding + MAIN_INNER_BORDER_INSET)}" y="${number(projection.plotTop + MAIN_INNER_BORDER_INSET)}" width="${number(width - padding * 2 - MAIN_INNER_BORDER_INSET * 2)}" height="${number(projection.plotHeight - MAIN_INNER_BORDER_INSET * 2)}" />`,
    '  </g>',
  ].join('\n');
}

function renderGridLabels(width, height, padding, projection = createMainChartProjection(width, height, padding), options = {}) {
  const { showBoundaryDecLabels = true } = options;
  const lines = [
    `  <g id="ra-dec-labels" fill="${RA_DEC_LABEL_FILL}" font-family="${RA_DEC_LABEL_FONT_FAMILY}" font-size="${RA_DEC_LABEL_FONT_SIZE}" font-weight="${RA_DEC_LABEL_FONT_WEIGHT}">`,
  ];

  for (const hour of createRaTicks(1)) {
    const x = padding + ((24 - hour) / 24) * (width - padding * 2);
    lines.push(`    <text x="${number(x)}" y="${number(projection.plotTop - MAIN_RA_TOP_LABEL_OFFSET_PX)}" text-anchor="middle">${hour}h</text>`);
    lines.push(`    <text x="${number(x)}" y="${number(projection.plotBottom + MAIN_RA_BOTTOM_LABEL_OFFSET_PX)}" text-anchor="middle">${hour}h</text>`);
  }

  const decLabelTicks = mainDecLabelTicks(10, projection).filter((dec) => (
    showBoundaryDecLabels || (dec !== projection.decMin && dec !== projection.decMax)
  ));

  for (const dec of decLabelTicks) {
    const y = projection.project(0, dec).y;
    lines.push(`    <text x="${padding - MAIN_DEC_LABEL_OFFSET_PX}" y="${number(y + 6)}" text-anchor="end">${dec > 0 ? '+' : ''}${dec}</text>`);
    lines.push(`    <text x="${width - padding + MAIN_DEC_LABEL_OFFSET_PX}" y="${number(y + 6)}" text-anchor="start">${dec > 0 ? '+' : ''}${dec}</text>`);
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderCoordinateReferenceLines(width, height, padding, projection = createMainChartProjection(width, height, padding)) {
  const eclipticPoints = createEclipticCoordinates().map((coordinate) => (
    projection.project(coordinate.ra, coordinate.dec)
  ));
  const vernalEquinox = projection.project(0, 0);

  return [
    `  <g id="coordinate-reference-lines" fill="none" stroke-linecap="round" stroke-linejoin="round">`,
    `    <polyline id="ecliptic" points="${pointsAttribute(eclipticPoints)}" stroke="${PRINT_CHART.constellationLine}" stroke-opacity="${CONSTELLATION_LINE_OPACITY}" stroke-width="${CONSTELLATION_LINE_WIDTH_PT}pt" stroke-dasharray="14 9" />`,
    `    <circle id="vernal-equinox-marker" cx="${number(vernalEquinox.x)}" cy="${number(vernalEquinox.y)}" r="4.2" fill="${PRINT_CHART.mutedText}" fill-opacity="0.9" stroke="${PRINT_CHART.background}" stroke-width="1.2" />`,
    '  </g>',
  ].join('\n');
}

function renderStars(id, stars, scale, opacity = 1, projection = createMainChartProjection(DEFAULT_CHART.width, DEFAULT_CHART.height, DEFAULT_CHART.padding)) {
  const opacityAttribute = opacity < 1 ? ` opacity="${opacity}"` : '';
  const lines = [`  <g id="${id}"${opacityAttribute}>`];

  for (const star of stars) {
    const point = mainPointForStar(star, projection);
    const radius = starRadius(star, scale) * SVG_RADIUS_SCALE;
    const strokeWidth = Math.max(0.08, Math.min(0.18, radius * 0.14));
    lines.push(
      `    <circle id="star-${star.id}" cx="${number(point.x)}" cy="${number(point.y)}" r="${number(radius)}" fill="${colorForStar(star)}" stroke="${PRINT_CHART.background}" stroke-width="${number(strokeWidth)}" />`,
    );
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function mainSegmentPiecesForStars(start, end, projection) {
  const deltaRa = Math.abs(start.ra - end.ra);
  const startPoint = mainPointForStar(start, projection);
  const endPoint = mainPointForStar(end, projection);

  if (deltaRa <= 12) return [[startPoint, endPoint]];

  const interpolateDeclinationAtRa = (sourceStart, sourceEnd, targetRa) => {
    const t = (targetRa - sourceStart.ra) / (sourceEnd.ra - sourceStart.ra);
    return sourceStart.dec + (sourceEnd.dec - sourceStart.dec) * t;
  };

  if (start.ra < end.ra) {
    const wrappedEnd = { ...end, ra: end.ra - 24 };
    const seamDec = interpolateDeclinationAtRa(start, wrappedEnd, 0);
    return [
      [startPoint, projection.project(0, seamDec)],
      [projection.project(24, seamDec), endPoint],
    ];
  }

  const wrappedEnd = { ...end, ra: end.ra + 24 };
  const seamDec = interpolateDeclinationAtRa(start, wrappedEnd, 24);
  return [
    [startPoint, projection.project(24, seamDec)],
    [projection.project(0, seamDec), endPoint],
  ];
}

function mainConstellationLineSegments(path, starsByHip, projection) {
  const segments = [];

  for (let index = 1; index < path.hips.length; index += 1) {
    const start = starsByHip.get(path.hips[index - 1]);
    const end = starsByHip.get(path.hips[index]);
    if (!start || !end) continue;

    segments.push(...mainSegmentPiecesForStars(start, end, projection));
  }

  return segments;
}

function renderConstellationLines(dataset, projection = createMainChartProjection(DEFAULT_CHART.width, DEFAULT_CHART.height, DEFAULT_CHART.padding)) {
  if (!dataset.constellations?.lines?.length) return '';

  const starsByHip = createHipStarMap(dataset.stars);
  const lines = [
    `  <g id="constellation-lines" fill="none" stroke="${PRINT_CHART.constellationLine}" stroke-opacity="${CONSTELLATION_LINE_OPACITY}" stroke-linecap="round" stroke-linejoin="round">`,
  ];

  for (const constellation of dataset.constellations.lines) {
    lines.push(`    <g id="constellation-${escapeXml(constellation.iau)}" data-name="${escapeXml(constellation.name)}">`);

    for (const path of constellation.paths) {
      for (const [start, end] of mainConstellationLineSegments(path, starsByHip, projection)) {
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

function sourceBoundaryPointToEquatorial(point) {
  return {
    ra: point[0],
    dec: point[1],
  };
}

function unwrappedBoundaryEnd(start, end) {
  const deltaRa = Math.abs(start.ra - end.ra);
  if (deltaRa <= 12) return end;
  return {
    ...end,
    ra: start.ra < end.ra ? end.ra - 24 : end.ra + 24,
  };
}

function interpolateBoundaryPoint(start, end, t) {
  return {
    ra: start.ra + (end.ra - start.ra) * t,
    dec: start.dec + (end.dec - start.dec) * t,
  };
}

function clipBoundarySegmentToProjection(start, end, projection) {
  let tMin = 0;
  let tMax = 1;
  const decDelta = end.dec - start.dec;

  const clipLower = (decLimit) => {
    if (decDelta === 0) return start.dec >= decLimit;
    const t = (decLimit - start.dec) / decDelta;
    if (decDelta > 0) tMin = Math.max(tMin, t);
    else tMax = Math.min(tMax, t);
    return true;
  };

  const clipUpper = (decLimit) => {
    if (decDelta === 0) return start.dec <= decLimit;
    const t = (decLimit - start.dec) / decDelta;
    if (decDelta > 0) tMax = Math.min(tMax, t);
    else tMin = Math.max(tMin, t);
    return true;
  };

  if (!clipLower(projection.decMin) || !clipUpper(projection.decMax) || tMin > tMax) return null;

  return [
    interpolateBoundaryPoint(start, end, tMin),
    interpolateBoundaryPoint(start, end, tMax),
  ];
}

function normalizedBoundaryRa(ra) {
  if (ra < 0) return ra + 24;
  if (ra > 24) return ra - 24;
  return ra;
}

function projectBoundaryPoint(point, projection) {
  return projection.project(normalizedBoundaryRa(point.ra), point.dec);
}

function pointsAreEqual(a, b) {
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
}

function appendBoundaryPathPiece(paths, piece) {
  if (piece.length < 2) return;

  const currentPath = paths.at(-1);
  if (currentPath?.length && pointsAreEqual(currentPath.at(-1), piece[0])) {
    currentPath.push(...piece.slice(1));
    return;
  }

  paths.push([...piece]);
}

function mainBoundarySegmentPieces(start, end, projection) {
  const clippedSegment = clipBoundarySegmentToProjection(start, unwrappedBoundaryEnd(start, end), projection);
  if (!clippedSegment) return [];

  const [clippedStart, clippedEnd] = clippedSegment;
  const crossesLeftSeam = clippedStart.ra >= 0 && clippedEnd.ra < 0;
  const crossesRightSeam = clippedStart.ra <= 24 && clippedEnd.ra > 24;

  if (!crossesLeftSeam && !crossesRightSeam) {
    return [[projectBoundaryPoint(clippedStart, projection), projectBoundaryPoint(clippedEnd, projection)]];
  }

  const seamRa = crossesLeftSeam ? 0 : 24;
  const t = (seamRa - clippedStart.ra) / (clippedEnd.ra - clippedStart.ra);
  const seamDec = clippedStart.dec + (clippedEnd.dec - clippedStart.dec) * t;
  const oppositeSeamRa = crossesLeftSeam ? 24 : 0;

  return [
    [projectBoundaryPoint(clippedStart, projection), projection.project(seamRa, seamDec)],
    [projection.project(oppositeSeamRa, seamDec), projectBoundaryPoint(clippedEnd, projection)],
  ];
}

function mainConstellationBoundaryPathSegments(points, projection) {
  const paths = [];

  for (let index = 1; index < points.length; index += 1) {
    const start = sourceBoundaryPointToEquatorial(points[index - 1]);
    const end = sourceBoundaryPointToEquatorial(points[index]);

    for (const piece of mainBoundarySegmentPieces(start, end, projection)) {
      appendBoundaryPathPiece(paths, piece);
    }
  }

  return paths;
}

function mainConstellationBoundaryPaths(projection) {
  return CONSTELLATION_BOUNDARIES.segments.map((segment) => ({
    id: segment.id,
    paths: mainConstellationBoundaryPathSegments(segment.points, projection),
  }));
}

function renderConstellationBoundaries(projection = createMainChartProjection(DEFAULT_CHART.width, DEFAULT_CHART.height, DEFAULT_CHART.padding)) {
  const lines = [
    `  <g id="constellation-boundaries" data-layer="Constellation boundaries" opacity="${CONSTELLATION_BOUNDARY_OPACITY}" fill="none" stroke="#ffffff" stroke-width="${illustratorPointSize(CONSTELLATION_BOUNDARY_WIDTH_PT)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 7" clip-path="url(#${MAIN_CHART_PLOT_CLIP_ID})">`,
  ];

  for (const boundary of mainConstellationBoundaryPaths(projection)) {
    lines.push(`    <g id="constellation-boundary-${escapeXml(boundary.id.replaceAll(':', '-'))}" data-segment="${escapeXml(boundary.id)}">`);

    for (const path of boundary.paths) {
      if (path.length < 2) continue;
      lines.push(`      <polyline points="${pointsAttribute(path)}" />`);
    }

    lines.push('    </g>');
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function mainConstellationLabelPosition(constellation, starsByHip, projection) {
  let weightedX = 0;
  let weightedY = 0;
  let totalWeight = 0;

  for (const path of constellation.paths) {
    for (const [start, end] of mainConstellationLineSegments(path, starsByHip, projection)) {
      const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
      weightedX += ((start.x + end.x) / 2) * length;
      weightedY += ((start.y + end.y) / 2) * length;
      totalWeight += length;
    }
  }

  if (totalWeight > 0) {
    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
    };
  }

  const points = constellation.paths
    .flatMap((path) => path.hips)
    .map((hip) => starsByHip.get(hip))
    .filter(Boolean)
    .map((star) => mainPointForStar(star, projection));

  if (!points.length) return null;

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function renderConstellationLabels(dataset, projection = createMainChartProjection(DEFAULT_CHART.width, DEFAULT_CHART.height, DEFAULT_CHART.padding)) {
  if (!dataset.constellations?.lines?.length) return '';

  const starsByHip = createHipStarMap(dataset.stars);
  const lines = [
    `  <g id="constellation-abbreviation-labels" fill="${CONSTELLATION_LABEL_FILL}" font-family="${CONSTELLATION_LABEL_FONT_FAMILY}" font-size="${CONSTELLATION_LABEL_FONT_SIZE}" font-weight="700" font-variant="small-caps" letter-spacing="0.6" text-anchor="middle">`,
  ];

  for (const constellation of dataset.constellations.lines) {
    const point = mainConstellationLabelPosition(constellation, starsByHip, projection);
    if (!point) continue;

    lines.push(
      `    <text id="constellation-label-${escapeXml(constellation.iau)}" x="${number(point.x)}" y="${number(point.y)}" data-name="${escapeXml(constellation.name)}">${escapeXml(constellation.iau)}</text>`,
    );
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderStarNameLabels(stars, projection = createMainChartProjection(DEFAULT_CHART.width, DEFAULT_CHART.height, DEFAULT_CHART.padding)) {
  const lines = [
    `  <g id="star-name-labels" fill="${STAR_NAME_LABEL_FILL}" font-family="${STAR_NAME_LABEL_FONT_FAMILY}" font-size="${STAR_NAME_LABEL_FONT_SIZE}">`,
  ];

  for (const star of stars) {
    const point = mainPointForStar(star, projection);
    lines.push(
      `    <text id="star-name-label-${star.id}" x="${number(point.x + MAIN_STAR_LABEL_X_OFFSET)}" y="${number(point.y + MAIN_STAR_LABEL_Y_OFFSET)}">${escapeXml(labelForStar(star))}</text>`,
    );
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderBayerDesignationLabels(stars, projection = createMainChartProjection(DEFAULT_CHART.width, DEFAULT_CHART.height, DEFAULT_CHART.padding)) {
  const lines = [
    `  <g id="bayer-designation-labels" fill="${BAYER_LABEL_FILL}" font-family="${BAYER_LABEL_FONT_FAMILY}" font-size="${BAYER_LABEL_FONT_SIZE}" font-weight="600" font-style="italic">`,
  ];

  for (const star of stars) {
    const point = mainPointForStar(star, projection);
    lines.push(
      `    <text id="bayer-designation-label-${star.id}" x="${number(point.x + MAIN_STAR_LABEL_X_OFFSET)}" y="${number(point.y + MAIN_STAR_LABEL_Y_OFFSET)}">${escapeXml(bayerGreekLetterForStar(star))}</text>`,
    );
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function isPleiadesMainChartLabelStar(star) {
  return isCoordinateInsideInsetBounds(PLEIADES_M45_BOUNDS, star.ra, star.dec, star.mag);
}

function renderMainClusterNameLabels(clusterLabels, projection = createMainChartProjection(DEFAULT_CHART.width, DEFAULT_CHART.height, DEFAULT_CHART.padding)) {
  const lines = [
    `  <g id="cluster-name-labels" fill="${STAR_NAME_LABEL_FILL}" font-family="${STAR_NAME_LABEL_FONT_FAMILY}" font-size="${STAR_NAME_LABEL_FONT_SIZE}" text-anchor="middle">`,
  ];

  for (const label of clusterLabels) {
    const point = projection.project(label.ra, label.dec);
    lines.push(
      `    <text id="cluster-name-label-${escapeXml(label.id)}" x="${number(point.x)}" y="${number(point.y)}">${escapeXml(label.label)}</text>`,
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
    return starRadiusForMagnitude(magnitude)
      * renderedStarRadiusScaleForMagnitude(magnitude)
      * SVG_RADIUS_SCALE;
  };
  const lines = [
    `  <g id="magnitude-scale" font-family="Arial, Helvetica, sans-serif">`,
    `    <text x="${number(titleX)}" y="${number(y + 5)}" fill="${PRINT_CHART.text}" fill-opacity="0.9" font-size="${illustratorPointSize(14)}" font-weight="700">visual magnitude</text>`,
    `    <line x1="${number(xStart)}" y1="${number(y)}" x2="${number(xEnd)}" y2="${number(y)}" stroke="${PRINT_CHART.mutedText}" stroke-opacity="0.42" stroke-width="1" />`,
  ];

  for (const magnitude of MAGNITUDE_SCALE_TICKS) {
    const x = xStart + ((magnitude + 1) / (DEFAULT_MAG_LIMIT + 1)) * scaleWidth;
    const radius = radiusForMagnitude(magnitude);
    const strokeWidth = Math.max(0.08, Math.min(0.18, radius * 0.14));
    lines.push(
      `    <circle cx="${number(x)}" cy="${number(y)}" r="${number(radius)}" fill="${colorForStar({ mag: magnitude })}" stroke="${PRINT_CHART.background}" stroke-width="${number(strokeWidth)}" />`,
    );
    lines.push(`    <text x="${number(x)}" y="${number(labelY)}" fill="${PRINT_CHART.mutedText}" fill-opacity="0.78" font-size="${illustratorPointSize(10)}" text-anchor="middle">${magnitude}</text>`);
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function formatRaLabel(ra) {
  const totalMinutes = Math.round(ra * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function formatDecLabel(dec) {
  const sign = dec >= 0 ? '+' : '-';
  const absolute = Math.abs(dec);
  const totalMinutes = Math.round(absolute * 60);
  const degrees = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${sign}${String(degrees).padStart(2, '0')}° ${String(minutes).padStart(2, '0')}'`;
}

function formatInsetBoundsSummary(bounds) {
  if (!hasDeclinationTrapezoidBoundary(bounds)) {
    return `RA ${formatRaLabel(bounds.raMin)} to ${formatRaLabel(bounds.raMax)} / Dec ${formatDecLabel(bounds.decMin)} to ${formatDecLabel(bounds.decMax)}`;
  }

  return [
    `bottom RA ${formatRaLabel(bounds.boundary.bottomRaMin)} to ${formatRaLabel(bounds.boundary.bottomRaMax)}`,
    `top RA ${formatRaLabel(bounds.boundary.topRaMin)} to ${formatRaLabel(bounds.boundary.topRaMax)}`,
    `Dec ${formatDecLabel(bounds.decMin)} to ${formatDecLabel(bounds.decMax)}`,
  ].join(' / ');
}

function ceilToStep(value, step) {
  return Math.ceil((value - 1e-9) / step) * step;
}

function floorToStep(value, step) {
  return Math.floor((value + 1e-9) / step) * step;
}

function radiansForDegrees(degrees) {
  return (degrees * Math.PI) / 180;
}

function radiansForHours(hours) {
  return radiansForDegrees(hours * 15);
}

function normalizedRadiansDelta(value) {
  let delta = value;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function stereographicPlanePoint(ra, dec, center) {
  const raDelta = normalizedRadiansDelta(radiansForHours(ra) - radiansForHours(center.ra));
  const decRad = radiansForDegrees(dec);
  const centerDecRad = radiansForDegrees(center.dec);
  const sinDec = Math.sin(decRad);
  const cosDec = Math.cos(decRad);
  const sinCenterDec = Math.sin(centerDecRad);
  const cosCenterDec = Math.cos(centerDecRad);
  const denominator = 1 + sinCenterDec * sinDec + cosCenterDec * cosDec * Math.cos(raDelta);

  if (denominator <= 1e-12) return null;

  const x = (2 * cosDec * Math.sin(raDelta)) / denominator;
  const y = (2 * (cosCenterDec * sinDec - sinCenterDec * cosDec * Math.cos(raDelta))) / denominator;

  return {
    x: -x,
    y: -y,
  };
}

function projectedBoundaryBounds(projectPlanePoint, bounds, sampleCount = 96) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  function include(point) {
    if (!point) return;
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  if (hasDeclinationTrapezoidBoundary(bounds)) {
    for (const coordinate of createInsetBoundaryCoordinates(bounds, sampleCount)) {
      include(projectPlanePoint(coordinate.ra, coordinate.dec));
    }

    return { minX, maxX, minY, maxY };
  }

  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / sampleCount;
    const ra = bounds.raMin + (bounds.raMax - bounds.raMin) * t;
    const dec = bounds.decMin + (bounds.decMax - bounds.decMin) * t;
    include(projectPlanePoint(ra, bounds.decMin));
    include(projectPlanePoint(ra, bounds.decMax));
    include(projectPlanePoint(bounds.raMin, dec));
    include(projectPlanePoint(bounds.raMax, dec));
  }

  return { minX, maxX, minY, maxY };
}

function createInsetProjection(inset, bounds, projectionType = 'linear') {
  const plotWidth = inset.width - inset.paddingLeft - inset.paddingRight;
  const plotHeight = inset.height - inset.paddingTop - inset.paddingBottom;
  const plotCenterX = inset.paddingLeft + plotWidth / 2;
  const plotCenterY = inset.paddingTop + plotHeight / 2;

  if (projectionType !== 'stereographic') {
    return {
      type: 'linear',
      project(ra, dec) {
        return {
          x: inset.paddingLeft + ((bounds.raMax - ra) / (bounds.raMax - bounds.raMin)) * plotWidth,
          y: inset.paddingTop + ((bounds.decMax - dec) / (bounds.decMax - bounds.decMin)) * plotHeight,
        };
      },
    };
  }

  const center = {
    ra: bounds.centerRa ?? (bounds.raMin + bounds.raMax) / 2,
    dec: bounds.centerDec ?? (bounds.decMin + bounds.decMax) / 2,
  };
  const projectPlanePoint = (ra, dec) => stereographicPlanePoint(ra, dec, center);
  const projectedBounds = projectedBoundaryBounds(projectPlanePoint, bounds);
  const projectedWidth = projectedBounds.maxX - projectedBounds.minX;
  const projectedHeight = projectedBounds.maxY - projectedBounds.minY;
  const scale = Math.min(plotWidth / projectedWidth, plotHeight / projectedHeight);
  const projectedCenterX = (projectedBounds.minX + projectedBounds.maxX) / 2;
  const projectedCenterY = (projectedBounds.minY + projectedBounds.maxY) / 2;

  return {
    type: 'stereographic',
    center,
    project(ra, dec) {
      const point = projectPlanePoint(ra, dec);
      if (!point) return null;

      return {
        x: plotCenterX + (point.x - projectedCenterX) * scale,
        y: plotCenterY + (point.y - projectedCenterY) * scale,
      };
    },
  };
}

function pointForInsetStar(star, projection) {
  return projection.project(star.ra, star.dec);
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

function sampleProjectedLine(projection, start, end, sampleCount = 80) {
  const points = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / sampleCount;
    const ra = start.ra + (end.ra - start.ra) * t;
    const dec = start.dec + (end.dec - start.dec) * t;
    const point = projection.project(ra, dec);
    if (point) points.push(point);
  }

  return points;
}

function pointsAttribute(points) {
  return points.map((point) => `${number(point.x)},${number(point.y)}`).join(' ');
}

function pathAttribute(points) {
  if (!points.length) return '';
  const [firstPoint, ...remainingPoints] = points;
  return [
    `M ${number(firstPoint.x)} ${number(firstPoint.y)}`,
    ...remainingPoints.map((point) => `L ${number(point.x)} ${number(point.y)}`),
    'Z',
  ].join(' ');
}

function createInsetBoundaryPoints(bounds, projection, sampleCount = 96) {
  return createInsetBoundaryCoordinates(bounds, sampleCount)
    .map((coordinate) => projection.project(coordinate.ra, coordinate.dec))
    .filter(Boolean);
}

function createInsetBoundaryCoordinates(bounds, sampleCount = 96) {
  if (hasDeclinationTrapezoidBoundary(bounds)) {
    const points = [];

    for (let index = 0; index <= sampleCount; index += 1) {
      const t = index / sampleCount;
      const ra = bounds.boundary.topRaMax - (bounds.boundary.topRaMax - bounds.boundary.topRaMin) * t;
      points.push({ ra, dec: bounds.decMax });
    }

    for (let index = 1; index <= sampleCount; index += 1) {
      const t = index / sampleCount;
      const dec = bounds.decMax - (bounds.decMax - bounds.decMin) * t;
      points.push({ ra: insetRaRangeAtDec(bounds, dec).raMin, dec });
    }

    for (let index = 1; index <= sampleCount; index += 1) {
      const t = index / sampleCount;
      const ra = bounds.boundary.bottomRaMin + (bounds.boundary.bottomRaMax - bounds.boundary.bottomRaMin) * t;
      points.push({ ra, dec: bounds.decMin });
    }

    for (let index = 1; index < sampleCount; index += 1) {
      const t = index / sampleCount;
      const dec = bounds.decMin + (bounds.decMax - bounds.decMin) * t;
      points.push({ ra: insetRaRangeAtDec(bounds, dec).raMax, dec });
    }

    return points;
  }

  const points = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / sampleCount;
    points.push({
      ra: bounds.raMax - (bounds.raMax - bounds.raMin) * t,
      dec: bounds.decMax,
    });
  }

  for (let index = 1; index <= sampleCount; index += 1) {
    const t = index / sampleCount;
    points.push({
      ra: bounds.raMin,
      dec: bounds.decMax - (bounds.decMax - bounds.decMin) * t,
    });
  }

  for (let index = 1; index <= sampleCount; index += 1) {
    const t = index / sampleCount;
    points.push({
      ra: bounds.raMin + (bounds.raMax - bounds.raMin) * t,
      dec: bounds.decMin,
    });
  }

  for (let index = 1; index < sampleCount; index += 1) {
    const t = index / sampleCount;
    points.push({
      ra: bounds.raMax,
      dec: bounds.decMin + (bounds.decMax - bounds.decMin) * t,
    });
  }

  return points;
}

function isInteriorCoordinate(value, min, max) {
  return value > min + 1e-9 && value < max - 1e-9;
}

function isOnStep(value, step) {
  return Math.abs(value / step - Math.round(value / step)) < 1e-7;
}

function hasInteriorGridLine(value, min, max, step) {
  return isInteriorCoordinate(value, min, max) && isOnStep(value, step);
}

function pointDistance(start, end) {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function isFarEnoughFromPreviousTick(point, previousPoint, minPixelSpacing) {
  return !previousPoint || pointDistance(point, previousPoint) >= minPixelSpacing;
}

function renderInsetGrid(idPrefix, inset, bounds, projection) {
  const lines = [
    `    <g id="${idPrefix}-grid" clip-path="url(#${idPrefix}-clip)" fill="none" stroke="${PRINT_CHART.grid}" stroke-width="1">`,
  ];

  const raTickStepHours = bounds.grid?.raStepHours ?? 5 / 60;
  const firstRaTick = ceilToStep(bounds.raMin, raTickStepHours);
  const lastRaTick = floorToStep(bounds.raMax, raTickStepHours);
  for (let ra = firstRaTick; ra <= lastRaTick + 1e-9; ra += raTickStepHours) {
    if (!isInteriorCoordinate(ra, bounds.raMin, bounds.raMax)) continue;
    const opacity = bounds.grid?.raStepHours ? GRID_OPACITY : Math.round(ra * 60) % 10 === 0 ? GRID_OPACITY : 0.24;
    const points = sampleProjectedLine(
      projection,
      { ra, dec: bounds.decMin },
      { ra, dec: bounds.decMax },
    );
    lines.push(`      <polyline points="${pointsAttribute(points)}" stroke-opacity="${opacity}" />`);
  }

  const decTickStep = bounds.grid?.decStepDegrees ?? 10 / 60;
  const firstDecTick = ceilToStep(bounds.decMin, decTickStep);
  const lastDecTick = floorToStep(bounds.decMax, decTickStep);
  for (let dec = firstDecTick; dec <= lastDecTick + 1e-9; dec += decTickStep) {
    if (!isInteriorCoordinate(dec, bounds.decMin, bounds.decMax)) continue;
    const opacity = bounds.grid?.decStepDegrees ? GRID_OPACITY : Math.round(dec * 60) % 60 === 0 ? GRID_OPACITY : 0.18;
    const raRange = insetRaRangeAtDec(bounds, dec);
    const points = sampleProjectedLine(
      projection,
      { ra: raRange.raMin, dec },
      { ra: raRange.raMax, dec },
    );
    lines.push(`      <polyline points="${pointsAttribute(points)}" stroke-opacity="${opacity}" />`);
  }

  lines.push('    </g>');
  lines.push(`    <g id="${idPrefix}-ra-axis-ticks" stroke="${PRINT_CHART.grid}" stroke-opacity="0.55" stroke-width="1">`);

  const smallRaTickStepHours = bounds.ticks?.raStepHours ?? 5 / 60;
  const minTickPixelSpacing = bounds.ticks?.minPixelSpacing ?? 0;
  const firstSmallRaTick = ceilToStep(bounds.raMin, smallRaTickStepHours);
  const lastSmallRaTick = floorToStep(bounds.raMax, smallRaTickStepHours);
  let previousTopRaTick = null;
  let previousBottomRaTick = null;
  for (let ra = firstSmallRaTick; ra <= lastSmallRaTick + 1e-9; ra += smallRaTickStepHours) {
    if (bounds.grid?.raStepHours && hasInteriorGridLine(ra, bounds.raMin, bounds.raMax, bounds.grid.raStepHours)) continue;
    const topRange = insetRaRangeAtDec(bounds, bounds.decMax);
    const bottomRange = insetRaRangeAtDec(bounds, bounds.decMin);
    const top = ra >= topRange.raMin && ra <= topRange.raMax ? projection.project(ra, bounds.decMax) : null;
    const bottom = ra >= bottomRange.raMin && ra <= bottomRange.raMax ? projection.project(ra, bounds.decMin) : null;
    const drawTopTick = top && isFarEnoughFromPreviousTick(top, previousTopRaTick, minTickPixelSpacing);
    const drawBottomTick = bottom && isFarEnoughFromPreviousTick(bottom, previousBottomRaTick, minTickPixelSpacing);
    if (!drawTopTick && !drawBottomTick) continue;
    const isMajorTick = bounds.grid?.raStepHours ? isOnStep(ra, bounds.grid.raStepHours) : Math.round(ra * 60) % 10 === 0;
    const tickLength = isMajorTick ? 12 : 7;
    if (drawTopTick) {
      lines.push(`      <line x1="${number(top.x)}" y1="${number(top.y)}" x2="${number(top.x)}" y2="${number(top.y + tickLength)}" />`);
      previousTopRaTick = top;
    }
    if (drawBottomTick) {
      lines.push(`      <line x1="${number(bottom.x)}" y1="${number(bottom.y)}" x2="${number(bottom.x)}" y2="${number(bottom.y - tickLength)}" />`);
      previousBottomRaTick = bottom;
    }
  }

  lines.push('    </g>');

  if (bounds.ticks?.decStepDegrees) {
    lines.push(`    <g id="${idPrefix}-dec-axis-ticks" stroke="${PRINT_CHART.grid}" stroke-opacity="0.55" stroke-width="1">`);

    const smallDecTickStepDegrees = bounds.ticks.decStepDegrees;
    const firstSmallDecTick = ceilToStep(bounds.decMin, smallDecTickStepDegrees);
    const lastSmallDecTick = floorToStep(bounds.decMax, smallDecTickStepDegrees);
    let previousLeftDecTick = null;
    let previousRightDecTick = null;
    for (let dec = firstSmallDecTick; dec <= lastSmallDecTick + 1e-9; dec += smallDecTickStepDegrees) {
      if (hasInteriorGridLine(dec, bounds.decMin, bounds.decMax, decTickStep)) continue;
      const raRange = insetRaRangeAtDec(bounds, dec);
      const left = projection.project(raRange.raMax, dec);
      const right = projection.project(raRange.raMin, dec);
      if (!left || !right) continue;
      const drawLeftTick = isFarEnoughFromPreviousTick(left, previousLeftDecTick, minTickPixelSpacing);
      const drawRightTick = isFarEnoughFromPreviousTick(right, previousRightDecTick, minTickPixelSpacing);
      if (!drawLeftTick && !drawRightTick) continue;
      const isMajorTick = isOnStep(dec, decTickStep);
      const tickLength = isMajorTick ? 12 : 7;
      if (drawLeftTick) {
        lines.push(`      <line x1="${number(left.x)}" y1="${number(left.y)}" x2="${number(left.x + tickLength)}" y2="${number(left.y)}" />`);
        previousLeftDecTick = left;
      }
      if (drawRightTick) {
        lines.push(`      <line x1="${number(right.x)}" y1="${number(right.y)}" x2="${number(right.x - tickLength)}" y2="${number(right.y)}" />`);
        previousRightDecTick = right;
      }
    }

    lines.push('    </g>');
  }

  return lines.join('\n');
}

function renderInsetCoordinateLabels(idPrefix, inset, bounds, projection) {
  const plotX = inset.paddingLeft;
  const plotY = inset.paddingTop;
  const plotWidth = inset.width - inset.paddingLeft - inset.paddingRight;
  const plotHeight = inset.height - inset.paddingTop - inset.paddingBottom;
  const lines = [
    `    <g id="${idPrefix}-coordinate-labels" fill="${RA_DEC_LABEL_FILL}" font-family="${RA_DEC_LABEL_FONT_FAMILY}" font-size="${RA_DEC_LABEL_FONT_SIZE}" font-weight="${RA_DEC_LABEL_FONT_WEIGHT}">`,
  ];

  const raTickStepHours = bounds.labels?.raStepHours ?? 10 / 60;
  const firstRaTick = ceilToStep(bounds.raMin, raTickStepHours);
  const lastRaTick = floorToStep(bounds.raMax, raTickStepHours);
  for (let ra = firstRaTick; ra <= lastRaTick + 1e-9; ra += raTickStepHours) {
    if (!isInteriorCoordinate(ra, bounds.raMin, bounds.raMax)) continue;
    const topRange = insetRaRangeAtDec(bounds, bounds.decMax);
    const bottomRange = insetRaRangeAtDec(bounds, bounds.decMin);
    const top = ra >= topRange.raMin && ra <= topRange.raMax ? projection.project(ra, bounds.decMax) : null;
    const bottom = ra >= bottomRange.raMin && ra <= bottomRange.raMax ? projection.project(ra, bounds.decMin) : null;
    if (top) lines.push(`      <text x="${number(top.x)}" y="${number(top.y - 10)}" text-anchor="middle">${formatRaLabel(ra)}</text>`);
    if (bottom) lines.push(`      <text x="${number(bottom.x)}" y="${number(bottom.y + 25)}" text-anchor="middle">${formatRaLabel(ra)}</text>`);
  }

  const decLabelStep = bounds.labels?.decStepDegrees ?? 2;
  const firstDecLabel = ceilToStep(bounds.decMin, decLabelStep);
  const lastDecLabel = floorToStep(bounds.decMax, decLabelStep);
  for (let dec = firstDecLabel; dec <= lastDecLabel + 1e-9; dec += decLabelStep) {
    if (!isInteriorCoordinate(dec, bounds.decMin, bounds.decMax)) continue;
    const raRange = insetRaRangeAtDec(bounds, dec);
    const left = projection.project(raRange.raMax, dec);
    const right = projection.project(raRange.raMin, dec);
    if (!left || !right) continue;
    lines.push(`      <text x="${number(left.x - 10)}" y="${number(left.y + 5)}" text-anchor="end">${formatDecLabel(dec)}</text>`);
    lines.push(`      <text x="${number(right.x + 10)}" y="${number(right.y + 5)}" text-anchor="start">${formatDecLabel(dec)}</text>`);
  }

  lines.push('    </g>');
  return lines.join('\n');
}

function renderInsetStars(idPrefix, stars, magnitudeRange, projection) {
  const lines = [`    <g id="${idPrefix}-stars" clip-path="url(#${idPrefix}-clip)">`];
  const sortedStars = [...stars].sort((a, b) => b.mag - a.mag);

  for (const star of sortedStars) {
    const point = pointForInsetStar(star, projection);
    if (!point) continue;
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

function renderInsetStarLabels(idPrefix, stars, magnitudeRange, projection) {
  const labelStars = stars.filter((star) => star.proper || star.mag <= 4.3);
  const lines = [
    `    <g id="${idPrefix}-star-labels" fill="${PRINT_CHART.text}" font-family="${STAR_NAME_LABEL_FONT_FAMILY}" font-size="${illustratorPointSize(11)}">`,
  ];

  for (const star of labelStars) {
    const point = pointForInsetStar(star, projection);
    if (!point) continue;
    const radius = insetStarRadius(star, magnitudeRange);
    lines.push(`      <text id="${idPrefix}-label-${star.id}" x="${number(point.x + radius + 4)}" y="${number(point.y - radius - 2)}">${escapeXml(labelForStar(star))}</text>`);
  }

  lines.push('    </g>');
  return lines.join('\n');
}

function renderGaiaInset({ idPrefix, layerName, title, inset, bounds, stars = [], projectionType = 'linear', sourceLabel = 'Gaia DR3' }) {
  const plotX = inset.paddingLeft;
  const magnitudeRange = createInsetMagnitudeRange(stars, bounds);
  const projection = createInsetProjection(inset, bounds, projectionType);
  const projectionLabel = projection.type === 'stereographic' ? 'stereographic conformal' : 'linear RA/Dec';
  const boundaryPath = pathAttribute(createInsetBoundaryPoints(bounds, projection));
  const boundsSummary = formatInsetBoundsSummary(bounds);

  return [
    `  <g id="${idPrefix}-layer" data-layer="${escapeXml(layerName)}" transform="translate(${inset.x} ${inset.y})">`,
    `    <title>${escapeXml(title)} Inset</title>`,
    `    <desc>${escapeXml(title)} chart using ${escapeXml(sourceLabel)} sources with ${projectionLabel} projection, bounded by ${escapeXml(boundsSummary)}, magnitude &lt;= ${bounds.magLimit}.</desc>`,
    '    <defs>',
    `      <clipPath id="${idPrefix}-clip"><path d="${boundaryPath}" /></clipPath>`,
    '    </defs>',
    `    <rect id="${idPrefix}-background" width="${inset.width}" height="${inset.height}" fill="${PRINT_CHART.background}" />`,
    `    <text id="${idPrefix}-title" x="${plotX}" y="28" fill="${PRINT_CHART.text}" font-family="Arial, Helvetica, sans-serif" font-size="${illustratorPointSize(22)}">${escapeXml(title)}</text>`,
    `    <text id="${idPrefix}-subtitle" x="${plotX}" y="48" fill="${PRINT_CHART.mutedText}" fill-opacity="${GRID_LABEL_OPACITY}" font-family="Arial, Helvetica, sans-serif" font-size="${illustratorPointSize(12)}">${escapeXml(sourceLabel)} / magnitude &lt;= ${bounds.magLimit} / ${escapeXml(boundsSummary)}</text>`,
    renderInsetGrid(idPrefix, inset, bounds, projection),
    renderInsetCoordinateLabels(idPrefix, inset, bounds, projection),
    renderInsetStars(idPrefix, stars, magnitudeRange, projection),
    renderInsetStarLabels(idPrefix, stars, magnitudeRange, projection),
    `    <g id="${idPrefix}-frame" fill="none" stroke="${PRINT_CHART.frame}" stroke-width="1.5">`,
    `      <path d="${boundaryPath}" />`,
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

function polarChartSize() {
  return {
    width: POLAR_CHART.widthIn * PRINT_CHART.unitsPerIn,
    height: POLAR_CHART.heightIn * PRINT_CHART.unitsPerIn,
  };
}

function polarRadiusForDec(dec, chart, radius) {
  if (chart.poleDec > 0) return ((chart.decMax - dec) / (chart.decMax - chart.decMin)) * radius;
  return ((dec - chart.decMin) / (chart.decMax - chart.decMin)) * radius;
}

function polarCleanInnerDec(chart) {
  return chart.poleDec > 0 ? POLAR_CLEAN_INNER_DECLINATION : -POLAR_CLEAN_INNER_DECLINATION;
}

function polarCleanInnerRadius(chart, radius) {
  return polarRadiusForDec(polarCleanInnerDec(chart), chart, radius);
}

function polarPointForCoordinates(ra, dec, chart, centerX, centerY, radius) {
  const angle = polarAngleForRa(ra, chart);
  const r = polarRadiusForDec(dec, chart, radius);
  return {
    x: centerX + Math.sin(angle) * r,
    y: centerY - Math.cos(angle) * r,
  };
}

function polarAngleForRa(ra, chart) {
  const angle = (ra / 24) * Math.PI * 2;
  return chart.mirrorRa ? -angle : angle;
}

function polarPointForRaRadius(ra, chart, radius, centerX, centerY) {
  const angle = polarAngleForRa(ra, chart);
  return {
    x: centerX + Math.sin(angle) * radius,
    y: centerY - Math.cos(angle) * radius,
  };
}

function polarPointForCelestialCoordinate(coordinate, chart, centerX, centerY, radius) {
  const [longitude, latitude] = coordinate;
  return polarPointForCoordinates(raHoursForCelestialLongitude(longitude), latitude, chart, centerX, centerY, radius);
}

function isStarInsidePolarChart(star, chart) {
  return star.mag <= DEFAULT_MAG_LIMIT && star.dec >= chart.decMin && star.dec <= chart.decMax;
}

function isDecInsidePolarChart(dec, chart) {
  return dec >= chart.decMin && dec <= chart.decMax;
}

function polarMilkyWayPathForRing(ring, chart, centerX, centerY, radius) {
  const points = ring.map((coordinate) => polarPointForCelestialCoordinate(coordinate, chart, centerX, centerY, radius));
  return pathAttribute(points);
}

function createPolarMilkyWayFeaturePaths(feature, chart, centerX, centerY, radius) {
  const paths = [];
  if (feature.geometry?.type !== 'MultiPolygon') return paths;

  for (const polygon of feature.geometry.coordinates) {
    const path = polygon
      .map((ring) => polarMilkyWayPathForRing(ring, chart, centerX, centerY, radius))
      .filter(Boolean)
      .join(' ');
    if (path) paths.push(path);
  }

  return paths;
}

function renderPolarPlotClipPath(centerX, centerY, radius) {
  return [
    '  <defs>',
    `    <clipPath id="${POLAR_CHART_PLOT_CLIP_ID}">`,
    `      <circle cx="${number(centerX)}" cy="${number(centerY)}" r="${number(radius)}" />`,
    '    </clipPath>',
    '  </defs>',
  ].join('\n');
}

function renderPolarMilkyWayLayer(chart, centerX, centerY, radius) {
  const lines = [
    `  <g id="milky-way-layer" data-layer="Milky Way outline" opacity="${MILKY_WAY_LAYER_OPACITY}" clip-path="url(#${POLAR_CHART_PLOT_CLIP_ID})">`,
    '    <desc>Faint Milky Way outlines from d3-celestial data/mw.json, projected into polar coordinates.</desc>',
  ];

  for (const [featureIndex, feature] of D3_CELESTIAL_MILKY_WAY.features.entries()) {
    const layerId = escapeXml(feature.id ?? `ol${featureIndex + 1}`);
    const opacity = MILKY_WAY_FEATURE_OPACITIES[featureIndex] ?? 0.02;
    const fill = featureIndex >= D3_CELESTIAL_MILKY_WAY.features.length - 2 ? PRINT_CHART.text : PRINT_CHART.mutedText;
    const paths = createPolarMilkyWayFeaturePaths(feature, chart, centerX, centerY, radius);

    lines.push(`    <g id="milky-way-${layerId}" data-brightness-step="${layerId}" fill="${fill}" fill-opacity="${opacity}" fill-rule="evenodd">`);
    for (const path of paths) {
      lines.push(`      <path d="${path}" />`);
    }
    lines.push('    </g>');
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderPolarEcliptic(chart, centerX, centerY, radius) {
  const lines = [
    `  <g id="coordinate-reference-lines" fill="none" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#${POLAR_CHART_PLOT_CLIP_ID})">`,
  ];
  let currentPoints = [];

  function flushCurrentPoints() {
    if (currentPoints.length < 2) {
      currentPoints = [];
      return;
    }

    lines.push(`    <polyline class="ecliptic-segment" points="${pointsAttribute(currentPoints)}" stroke="${PRINT_CHART.constellationLine}" stroke-opacity="${CONSTELLATION_LINE_OPACITY}" stroke-width="${CONSTELLATION_LINE_WIDTH_PT}pt" stroke-dasharray="14 9" />`);
    currentPoints = [];
  }

  for (const coordinate of createEclipticCoordinates(1)) {
    if (coordinate.dec < chart.decMin || coordinate.dec > chart.decMax) {
      flushCurrentPoints();
      continue;
    }

    currentPoints.push(polarPointForCoordinates(coordinate.ra, coordinate.dec, chart, centerX, centerY, radius));
  }

  flushCurrentPoints();
  lines.push('  </g>');
  return lines.join('\n');
}

function renderPolarConstellationLines(dataset, chart, centerX, centerY, radius) {
  if (!dataset.constellations?.lines?.length) return '';

  const starsByHip = createHipStarMap(dataset.stars);
  const stroke = chart.id === 'south-polar' ? '#fff' : PRINT_CHART.constellationLine;
  const strokeWidth = chart.id === 'south-polar' ? 0.8 : CONSTELLATION_LINE_WIDTH_PT;
  const lines = [
    `  <g id="constellation-lines" fill="none" stroke="${stroke}" stroke-opacity="${CONSTELLATION_LINE_OPACITY}" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#${POLAR_CHART_PLOT_CLIP_ID})">`,
  ];

  for (const constellation of dataset.constellations.lines) {
    lines.push(`    <g id="constellation-${escapeXml(constellation.iau)}" data-name="${escapeXml(constellation.name)}">`);

    for (const path of constellation.paths) {
      for (let index = 1; index < path.hips.length; index += 1) {
        const start = starsByHip.get(path.hips[index - 1]);
        const end = starsByHip.get(path.hips[index]);
        if (!start || !end) continue;
        if (
          (start.dec < chart.decMin && end.dec < chart.decMin)
          || (start.dec > chart.decMax && end.dec > chart.decMax)
        ) {
          continue;
        }

        const startPoint = polarPointForCoordinates(start.ra, start.dec, chart, centerX, centerY, radius);
        const endPoint = polarPointForCoordinates(end.ra, end.dec, chart, centerX, centerY, radius);
        lines.push(
          `      <line x1="${number(startPoint.x)}" y1="${number(startPoint.y)}" x2="${number(endPoint.x)}" y2="${number(endPoint.y)}" stroke-width="${strokeWidth}pt" />`,
        );
      }
    }

    lines.push('    </g>');
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function polarConstellationBoundaryPathSegments(path, chart, centerX, centerY, radius) {
  const segments = [];
  let currentPoints = [];

  for (let index = 0; index < path.length; index += 1) {
    const coordinate = sourceBoundaryPointToEquatorial(path[index]);
    const inside = isDecInsidePolarChart(coordinate.dec, chart);
    const previousCoordinate = index > 0 ? sourceBoundaryPointToEquatorial(path[index - 1]) : null;
    const nextCoordinate = index < path.length - 1 ? sourceBoundaryPointToEquatorial(path[index + 1]) : null;
    const previousInside = previousCoordinate ? isDecInsidePolarChart(previousCoordinate.dec, chart) : false;
    const nextInside = nextCoordinate ? isDecInsidePolarChart(nextCoordinate.dec, chart) : false;

    if (inside || previousInside || nextInside) {
      currentPoints.push(polarPointForCoordinates(coordinate.ra, coordinate.dec, chart, centerX, centerY, radius));
      continue;
    }

    if (currentPoints.length >= 2) segments.push(currentPoints);
    currentPoints = [];
  }

  if (currentPoints.length >= 2) segments.push(currentPoints);
  return segments;
}

function renderPolarConstellationBoundaries(chart, centerX, centerY, radius) {
  const lines = [
    `  <g id="constellation-boundaries" data-layer="Constellation boundaries" opacity="${CONSTELLATION_BOUNDARY_OPACITY}" fill="none" stroke="#ffffff" stroke-width="${illustratorPointSize(CONSTELLATION_BOUNDARY_WIDTH_PT)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 7" clip-path="url(#${POLAR_CHART_PLOT_CLIP_ID})">`,
  ];

  for (const boundary of CONSTELLATION_BOUNDARIES.segments) {
    lines.push(`    <g id="constellation-boundary-${escapeXml(boundary.id.replaceAll(':', '-'))}" data-segment="${escapeXml(boundary.id)}">`);

    for (const segment of polarConstellationBoundaryPathSegments(boundary.points, chart, centerX, centerY, radius)) {
      lines.push(`      <polyline points="${pointsAttribute(segment)}" />`);
    }

    lines.push('    </g>');
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function polarConstellationLineSegments(path, starsByHip, chart, centerX, centerY, radius) {
  const segments = [];

  for (let index = 1; index < path.hips.length; index += 1) {
    const start = starsByHip.get(path.hips[index - 1]);
    const end = starsByHip.get(path.hips[index]);
    if (!start || !end) continue;
    if (
      (start.dec < chart.decMin && end.dec < chart.decMin)
      || (start.dec > chart.decMax && end.dec > chart.decMax)
    ) {
      continue;
    }

    segments.push([
      polarPointForCoordinates(start.ra, start.dec, chart, centerX, centerY, radius),
      polarPointForCoordinates(end.ra, end.dec, chart, centerX, centerY, radius),
    ]);
  }

  return segments;
}

function polarConstellationLabelPosition(constellation, starsByHip, chart, centerX, centerY, radius) {
  let weightedX = 0;
  let weightedY = 0;
  let totalWeight = 0;

  for (const path of constellation.paths) {
    for (const [start, end] of polarConstellationLineSegments(path, starsByHip, chart, centerX, centerY, radius)) {
      const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
      weightedX += ((start.x + end.x) / 2) * length;
      weightedY += ((start.y + end.y) / 2) * length;
      totalWeight += length;
    }
  }

  if (totalWeight > 0) {
    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
    };
  }

  const points = constellation.paths
    .flatMap((path) => path.hips)
    .map((hip) => starsByHip.get(hip))
    .filter((star) => star && isStarInsidePolarChart(star, chart))
    .map((star) => polarPointForCoordinates(star.ra, star.dec, chart, centerX, centerY, radius));

  if (!points.length) return null;

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function renderPolarConstellationLabels(dataset, chart, centerX, centerY, radius) {
  if (!dataset.constellations?.lines?.length) return '';

  const starsByHip = createHipStarMap(dataset.stars);
  const lines = [
    `  <g id="constellation-abbreviation-labels" fill="${CONSTELLATION_LABEL_FILL}" font-family="${CONSTELLATION_LABEL_FONT_FAMILY}" font-size="${CONSTELLATION_LABEL_FONT_SIZE}" font-weight="700" font-variant="small-caps" letter-spacing="0.6" text-anchor="middle" clip-path="url(#${POLAR_CHART_PLOT_CLIP_ID})">`,
  ];

  for (const constellation of dataset.constellations.lines) {
    const point = polarConstellationLabelPosition(constellation, starsByHip, chart, centerX, centerY, radius);
    if (!point) continue;

    lines.push(
      `    <text id="constellation-label-${escapeXml(constellation.iau)}" x="${number(point.x)}" y="${number(point.y)}" data-name="${escapeXml(constellation.name)}">${escapeXml(constellation.iau)}</text>`,
    );
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderPolarGrid(chart, centerX, centerY, radius) {
  const innerRadius = polarCleanInnerRadius(chart, radius);
  const outerRadius = radius * POLAR_OUTER_FRAME_RADIUS_SCALE;
  const lines = [
    `  <g id="polar-grid" fill="none" stroke="${PRINT_CHART.grid}" stroke-opacity="${GRID_OPACITY}" stroke-width="1">`,
  ];

  for (let dec = chart.decMin; dec <= chart.decMax + 1e-9; dec += 10) {
    const circleRadius = polarRadiusForDec(dec, chart, radius);
    if (circleRadius < innerRadius - 1e-9) continue;
    lines.push(`    <circle cx="${number(centerX)}" cy="${number(centerY)}" r="${number(circleRadius)}" />`);
  }

  for (const hour of createRaTicks(1)) {
    if (hour === 24) continue;
    const inner = polarPointForCoordinates(hour, polarCleanInnerDec(chart), chart, centerX, centerY, radius);
    const edge = polarPointForRaRadius(hour, chart, outerRadius, centerX, centerY);
    lines.push(`    <line x1="${number(inner.x)}" y1="${number(inner.y)}" x2="${number(edge.x)}" y2="${number(edge.y)}" />`);
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderPolarGridLabels(chart, centerX, centerY, radius) {
  const decLabelDirection = chart.mirrorRa ? -1 : 1;
  const decLabelAnchor = chart.mirrorRa ? 'end' : 'start';
  const lines = [
    `  <g id="polar-grid-labels" fill="${RA_DEC_LABEL_FILL}" font-family="${RA_DEC_LABEL_FONT_FAMILY}" font-size="${RA_DEC_LABEL_FONT_SIZE}" font-weight="${RA_DEC_LABEL_FONT_WEIGHT}">`,
  ];

  for (const hour of createRaTicks(1)) {
    if (hour === 24) continue;
    const point = polarPointForCoordinates(hour, chart.poleDec > 0 ? chart.decMin : chart.decMax, chart, centerX, centerY, radius + 28);
    lines.push(`    <text x="${number(point.x)}" y="${number(point.y)}" text-anchor="middle" dominant-baseline="middle">${hour}h</text>`);
  }

  for (let dec = chart.decMin; dec <= chart.decMax + 1e-9; dec += 10) {
    if (Math.abs(dec) === 90 || dec === chart.decMin || dec === chart.decMax) continue;
    const circleRadius = polarRadiusForDec(dec, chart, radius);
    const labelAdjustment =
      chart.id === 'north-polar'
        ? POLAR_NORTH_DEC_LABEL_X_OFFSET
        : chart.id === 'south-polar'
          ? POLAR_SOUTH_DEC_LABEL_X_OFFSET
          : 0;
    const x = centerX + decLabelDirection * (circleRadius + 8) + labelAdjustment;
    lines.push(`    <text x="${number(x)}" y="${number(centerY - 5)}" text-anchor="${decLabelAnchor}">${dec > 0 ? '+' : ''}${dec}°</text>`);
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderPolarDecAxisTicks(chart, centerX, centerY, radius) {
  const decAxisDirection = chart.mirrorRa ? -1 : 1;
  const lines = [
    `  <g id="polar-dec-axis-ticks" fill="none" stroke="${PRINT_CHART.grid}" stroke-opacity="${GRID_LABEL_OPACITY}" stroke-width="1" stroke-linecap="butt">`,
  ];

  const maxTickDec = chart.id === 'north-polar' ? Math.min(chart.decMax, POLAR_NORTH_DEC_AXIS_TICK_MAX) : chart.decMax;
  const minTickDec = chart.id === 'south-polar' ? Math.max(chart.decMin, POLAR_SOUTH_DEC_AXIS_TICK_MIN) : chart.decMin;
  for (let dec = minTickDec; dec <= maxTickDec + 1e-9; dec += POLAR_DEC_TICK_STEP_DEGREES) {
    if (Math.abs(dec) === 90 || dec === chart.decMin || dec === chart.decMax) continue;
    if (isOnStep(dec, POLAR_DEC_LABEL_STEP_DEGREES)) continue;

    const tickRadius = polarRadiusForDec(dec, chart, radius);
    const isMajorTick = isOnStep(dec, POLAR_DEC_MAJOR_TICK_STEP_DEGREES);
    const tickLength = isMajorTick ? POLAR_DEC_MAJOR_TICK_LENGTH : POLAR_DEC_MINOR_TICK_LENGTH;
    const x = centerX + decAxisDirection * tickRadius;
    const y1 = centerY - tickLength / 2;
    const y2 = centerY + tickLength / 2;
    lines.push(`    <line x1="${number(x)}" y1="${number(y1)}" x2="${number(x)}" y2="${number(y2)}" />`);
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderPolarRaFrameTicks(chart, centerX, centerY, radius) {
  const outerRadius = radius * POLAR_OUTER_FRAME_RADIUS_SCALE;
  const frameBandWidth = outerRadius - radius;
  const lines = [
    `    <g id="polar-ra-frame-ticks" fill="none" stroke="${PRINT_CHART.frame}" stroke-opacity="${POLAR_OUTER_FRAME_OPACITY}" stroke-width="1" stroke-linecap="butt">`,
  ];

  for (const tick of createRaMinuteTicks(POLAR_RA_FRAME_TICK_STEP_MINUTES)) {
    if (tick.hour >= 24) continue;
    const minuteWithinHour = tick.minute % 60;
    if (minuteWithinHour === 0) continue;
    const isMajorTick = POLAR_RA_FRAME_MAJOR_TICK_MINUTES.has(minuteWithinHour);
    const tickInnerRadius = isMajorTick ? radius : outerRadius - frameBandWidth * POLAR_RA_FRAME_MINOR_TICK_WIDTH_RATIO;
    const inner = polarPointForRaRadius(tick.hour, chart, tickInnerRadius, centerX, centerY);
    const outer = polarPointForRaRadius(tick.hour, chart, outerRadius, centerX, centerY);
    lines.push(`      <line x1="${number(inner.x)}" y1="${number(inner.y)}" x2="${number(outer.x)}" y2="${number(outer.y)}" />`);
  }

  lines.push('    </g>');
  return lines.join('\n');
}

function renderPolarCleanInnerCircle(chart, centerX, centerY, radius) {
  const innerRadius = polarCleanInnerRadius(chart, radius);

  return [
    `    <g id="polar-clean-inner-circle" fill="#000000" stroke="${PRINT_CHART.grid}" stroke-opacity="${GRID_OPACITY}" stroke-width="1">`,
    `      <circle cx="${number(centerX)}" cy="${number(centerY)}" r="${number(innerRadius)}" />`,
    '    </g>',
  ].join('\n');
}

function renderPolarStars(chart, stars, centerX, centerY, radius) {
  const brightStars = stars.filter((star) => star.mag <= BRIGHT_STAR_MAGNITUDE_LIMIT);
  const dimStars = stars.filter((star) => star.mag > BRIGHT_STAR_MAGNITUDE_LIMIT);
  const polarRadiusScaleForMagnitude = (magnitude, baseScale) => {
    const brightness = Math.min(1, Math.max(0, (DEFAULT_MAG_LIMIT - magnitude) / (DEFAULT_MAG_LIMIT + 1.5)));
    return baseScale * (1 + brightness * (POLAR_BRIGHT_STAR_RADIUS_ENHANCEMENT - 1));
  };

  function renderGroup(id, groupStars, scale, opacity = 1) {
    const opacityAttribute = opacity < 1 ? ` opacity="${opacity}"` : '';
    const lines = [`  <g id="${id}"${opacityAttribute}>`];
    for (const star of [...groupStars].sort((a, b) => b.mag - a.mag)) {
      const point = polarPointForCoordinates(star.ra, star.dec, chart, centerX, centerY, radius);
      const starPointRadius = starRadius(star, polarRadiusScaleForMagnitude(star.mag, scale)) * POLAR_SVG_RADIUS_SCALE;
      const strokeWidth = Math.max(0.08, Math.min(0.18, starPointRadius * 0.14));
      lines.push(`    <circle id="star-${star.id}" cx="${number(point.x)}" cy="${number(point.y)}" r="${number(starPointRadius)}" fill="${colorForStar(star)}" stroke="${PRINT_CHART.background}" stroke-width="${number(strokeWidth)}" />`);
    }
    lines.push('  </g>');
    return lines.join('\n');
  }

  return [
    renderGroup('stars-bright', brightStars, renderedStarRadiusScaleForMagnitude(BRIGHT_STAR_MAGNITUDE_LIMIT)),
    renderGroup('stars-dim', dimStars, POLAR_DIM_STAR_RADIUS_SCALE, DIM_STAR_OPACITY),
  ].join('\n');
}

function renderPolarStarNameLabels(chart, stars, centerX, centerY, radius) {
  const labelStars = stars.filter((star) => star.proper);
  const lines = [
    `  <g id="star-name-labels" fill="${STAR_NAME_LABEL_FILL}" font-family="${STAR_NAME_LABEL_FONT_FAMILY}" font-size="${STAR_NAME_LABEL_FONT_SIZE}">`,
  ];

  for (const star of labelStars) {
    const point = polarPointForCoordinates(star.ra, star.dec, chart, centerX, centerY, radius);
    lines.push(`    <text id="star-name-label-${star.id}" x="${number(point.x + POLAR_STAR_LABEL_X_OFFSET)}" y="${number(point.y + POLAR_STAR_LABEL_Y_OFFSET)}">${escapeXml(labelForStar(star))}</text>`);
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderPolarBayerDesignationLabels(chart, stars, centerX, centerY, radius) {
  const labelStars = stars.filter(shouldLabelBayerStar);
  const lines = [
    `  <g id="bayer-designation-labels" fill="${BAYER_LABEL_FILL}" font-family="${BAYER_LABEL_FONT_FAMILY}" font-size="${BAYER_LABEL_FONT_SIZE}" font-weight="600" font-style="italic">`,
  ];

  for (const star of labelStars) {
    const point = polarPointForCoordinates(star.ra, star.dec, chart, centerX, centerY, radius);
    lines.push(`    <text id="bayer-designation-label-${star.id}" x="${number(point.x + POLAR_STAR_LABEL_X_OFFSET)}" y="${number(point.y + POLAR_STAR_LABEL_Y_OFFSET)}">${escapeXml(bayerGreekLetterForStar(star))}</text>`);
  }

  lines.push('  </g>');
  return lines.join('\n');
}

function renderPolarStarChartLayer(dataset, chart) {
  const { width, height } = polarChartSize();
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - POLAR_CHART.padding;
  const stars = dataset.stars.filter((star) => isStarInsidePolarChart(star, chart));
  const nameLabels = stars.filter((star) => star.proper);
  const bayerLabels = stars.filter(shouldLabelBayerStar);
  const constellationLabels = renderPolarConstellationLabels(dataset, chart, centerX, centerY, radius);
  const constellationLabelCount = constellationLabels.match(/<text id="constellation-label-/g)?.length ?? 0;
  const decSummary = `${chart.decMin > 0 ? '+' : ''}${chart.decMin}° to ${chart.decMax > 0 ? '+' : ''}${chart.decMax}°`;

  return {
    svg: [
      `  <g id="${chart.id}-star-chart">`,
      `    <rect width="${width}" height="${height}" fill="${PRINT_CHART.background}" />`,
      renderPolarPlotClipPath(centerX, centerY, radius),
      renderPolarMilkyWayLayer(chart, centerX, centerY, radius),
      renderPolarGrid(chart, centerX, centerY, radius),
      renderPolarGridLabels(chart, centerX, centerY, radius),
      renderPolarDecAxisTicks(chart, centerX, centerY, radius),
      renderPolarEcliptic(chart, centerX, centerY, radius),
      renderPolarCleanInnerCircle(chart, centerX, centerY, radius),
      renderPolarConstellationBoundaries(chart, centerX, centerY, radius),
      renderPolarConstellationLines(dataset, chart, centerX, centerY, radius),
      renderPolarStars(chart, stars, centerX, centerY, radius),
      constellationLabels,
      renderPolarStarNameLabels(chart, nameLabels, centerX, centerY, radius),
      renderPolarBayerDesignationLabels(chart, bayerLabels, centerX, centerY, radius),
      renderPolarRaFrameTicks(chart, centerX, centerY, radius),
      `    <g id="frame" fill="none" stroke="${PRINT_CHART.frame}" stroke-opacity="${POLAR_OUTER_FRAME_OPACITY}" stroke-width="${POLAR_OUTER_FRAME_WIDTH_PT}pt">`,
      `      <circle cx="${number(centerX)}" cy="${number(centerY)}" r="${number(radius * POLAR_OUTER_FRAME_RADIUS_SCALE)}" />`,
      '    </g>',
      `    <g id="legend" fill="${PRINT_CHART.mutedText}" font-family="Arial, Helvetica, sans-serif" font-size="${illustratorPointSize(16)}">`,
      `      <text x="${POLAR_CHART.padding}" y="${height - 34}">HYG v4.2 / CC-BY-SA 4.0 / magnitude &lt;= ${dataset.magLimit} / declination ${escapeXml(decSummary)} / ${stars.length.toLocaleString()} stars</text>`,
      '    </g>',
      '  </g>',
    ].join('\n'),
    starCount: stars.length,
    labelCount: nameLabels.length + bayerLabels.length + constellationLabelCount,
  };
}

function renderMainStarChartLayer(dataset, { chartX = 0, chartY = 0, chart = MAIN_STAR_CHARTS[MAIN_STAR_CHART_ID] } = {}) {
  const width = DEFAULT_CHART.width;
  const height = DEFAULT_CHART.height;
  const padding = DEFAULT_CHART.padding;
  const projection = createMainChartProjection(width, height, padding, chart);
  const stars = dataset.stars.filter((star) => projection.containsDec(star.dec));
  const brightStars = stars.filter((star) => star.mag <= BRIGHT_STAR_MAGNITUDE_LIMIT);
  const dimStars = stars.filter((star) => star.mag > BRIGHT_STAR_MAGNITUDE_LIMIT);
  const labels = stars.filter(shouldLabelStar);
  const mainChartLabeledStars = stars.filter((star) => !isPleiadesMainChartLabelStar(star));
  const nameLabels = labels.filter((star) => star.proper && !isPleiadesMainChartLabelStar(star));
  const bayerLabels = mainChartLabeledStars.filter(shouldLabelBayerStar);
  const clusterNameLabels = MAIN_CHART_CLUSTER_LABELS.filter((label) => projection.containsDec(label.dec));
  const decSummary = `${chart.decMin > 0 ? '+' : ''}${chart.decMin}Â° to ${chart.decMax > 0 ? '+' : ''}${chart.decMax}Â°`;
  const transform = chartX || chartY ? ` transform="translate(${chartX} ${chartY})"` : '';
  const parts = [
    `  <g id="equirectangular-star-chart" transform="translate(${chartX} ${chartY})">`,
    '  <g id="chart-background">',
    `    <rect width="${width}" height="${height}" fill="${PRINT_CHART.background}" />`,
    '  </g>',
    renderPlotClipPath(width, height, padding, projection),
    renderMilkyWayLayer(width, height, padding, projection),
    renderGrid(width, height, padding, projection),
    renderMainInnerBorder(width, padding, projection),
    renderMainDecAxisTicks(width, padding, projection),
    renderGridLabels(width, height, padding, projection, { showBoundaryDecLabels: chart.showBoundaryDecLabels }),
    renderCoordinateReferenceLines(width, height, padding, projection),
    renderConstellationBoundaries(projection),
    renderConstellationLines({ ...dataset, stars }, projection),
    renderConstellationLabels({ ...dataset, stars }, projection),
    renderStars('stars-bright', brightStars, renderedStarRadiusScaleForMagnitude(BRIGHT_STAR_MAGNITUDE_LIMIT), 1, projection),
    renderStars('stars-dim', dimStars, 1, DIM_STAR_OPACITY, projection),
    renderStarNameLabels(nameLabels, projection),
    renderBayerDesignationLabels(bayerLabels, projection),
    renderMainClusterNameLabels(clusterNameLabels, projection),
    `  <g id="frame" fill="none" stroke="${PRINT_CHART.frame}" stroke-width="2">`,
    `    <rect x="${padding}" y="${number(projection.plotTop)}" width="${width - padding * 2}" height="${number(projection.plotHeight)}" />`,
    '  </g>',
    `  <g id="legend" fill="${PRINT_CHART.mutedText}" font-family="Arial, Helvetica, sans-serif" font-size="${illustratorPointSize(18)}">`,
    `    <text x="${padding}" y="${height - 24}">HYG v4.2 / CC-BY-SA 4.0 / magnitude &lt;= ${dataset.magLimit} / declination ${escapeXml(decSummary)} / ${stars.length.toLocaleString()} stars</text>`,
    '  </g>',
    renderMagnitudeScale(width, height, padding),
    '  </g>',
  ];

  parts[0] = `  <g id="equirectangular-star-chart"${transform}>`;

  return {
    svg: parts.join('\n'),
    labelCount: nameLabels.length + bayerLabels.length + clusterNameLabels.length,
    starCount: stars.length,
  };
}

export function renderMainStarChartSvg(dataset, options = {}) {
  const chart = options.chart ?? MAIN_STAR_CHARTS[MAIN_STAR_CHART_ID];
  const { svg, labelCount, starCount } = renderMainStarChartLayer(dataset, { chart });

  return {
    svg: renderSvgDocument({
      widthIn: PRINT_CHART.chartWidthIn,
      heightIn: PRINT_CHART.chartHeightIn,
      title: chart.title,
      ariaLabel: `${chart.title} using HYG v4.2 stars`,
      desc: `HYG v4.2 equirectangular star chart, magnitude <= ${dataset.magLimit}, declination ${chart.decMin} to ${chart.decMax}, generated for Illustrator editing.`,
      xmlDeclaration: options.xmlDeclaration,
      parts: [svg],
    }),
    labelCount,
    starCount,
  };
}

export function renderPolarStarChartSvg(chartId, dataset, options = {}) {
  const chart = getPolarStarChart(chartId);
  if (!chart) {
    throw new Error(`Unknown polar star chart "${chartId}". Use one of: ${Object.keys(POLAR_STAR_CHARTS).join(', ')}.`);
  }

  const { svg, starCount, labelCount } = renderPolarStarChartLayer(dataset, chart);

  return {
    svg: renderSvgDocument({
      widthIn: POLAR_CHART.widthIn,
      heightIn: POLAR_CHART.heightIn,
      title: chart.title,
      ariaLabel: `${chart.title} using HYG v4.2 stars`,
      desc: `${chart.title}, polar projection by right ascension and declination, HYG v4.2 magnitude <= ${dataset.magLimit}, declination ${chart.decMin} to ${chart.decMax}.`,
      xmlDeclaration: options.xmlDeclaration,
      parts: [svg],
    }),
    starCount,
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
      desc: `${chart.title} chart using ${chart.sourceLabel ?? 'Gaia DR3'} sources, bounded by ${formatInsetBoundsSummary(chart.bounds)}, magnitude <= ${chart.bounds.magLimit}.`,
      xmlDeclaration: options.xmlDeclaration,
      parts: [
        renderGaiaInset({
          idPrefix: chart.id === 'pleiades' ? 'pleiades-m45' : chart.id,
          layerName: chart.layerName,
          title: chart.title,
          inset,
          bounds: chart.bounds,
          stars,
          projectionType: chart.projection,
          sourceLabel: chart.sourceLabel,
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
      desc: `HYG v4.2 star chart, magnitude <= ${dataset.magLimit}, generated for Illustrator editing. The lower 24 x 12 inch portion contains the equirectangular chart; the upper area contains separate Gaia DR3 inset layers for Scorpio, Lyra, and the Pleiades Cluster M45.`,
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
          projectionType: INSET_STAR_CHARTS.scorpio.projection,
          sourceLabel: INSET_STAR_CHARTS.scorpio.sourceLabel,
        }),
        renderGaiaInset({
          idPrefix: 'pleiades-m45',
          layerName: INSET_STAR_CHARTS.pleiades.layerName,
          title: INSET_STAR_CHARTS.pleiades.title,
          inset: INSET_STAR_CHARTS.pleiades.inset,
          bounds: INSET_STAR_CHARTS.pleiades.bounds,
          stars: options.pleiadesStars,
          projectionType: INSET_STAR_CHARTS.pleiades.projection,
          sourceLabel: INSET_STAR_CHARTS.pleiades.sourceLabel,
        }),
        renderGaiaInset({
          idPrefix: 'lyra',
          layerName: INSET_STAR_CHARTS.lyra.layerName,
          title: INSET_STAR_CHARTS.lyra.title,
          inset: INSET_STAR_CHARTS.lyra.inset,
          bounds: INSET_STAR_CHARTS.lyra.bounds,
          stars: options.lyraStars,
          projectionType: INSET_STAR_CHARTS.lyra.projection,
          sourceLabel: INSET_STAR_CHARTS.lyra.sourceLabel,
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
    if (getPolarStarChart(chartId)) return renderPolarStarChartSvg(chartId, dataset, options);
  }

  return renderCompositeStarChartSvg(dataset, options);
}
