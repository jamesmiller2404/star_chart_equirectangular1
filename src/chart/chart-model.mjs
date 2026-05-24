export const PRINT_CHART = {
  widthIn: 24,
  heightIn: 12,
  unitsPerIn: 100,
  padding: 70,
  background: '#05070b',
  frame: '#aeb8c7',
  grid: '#526176',
  text: '#eef3f8',
  mutedText: '#aeb8c7',
  accent: '#f1c45f',
};

export const DEFAULT_CHART = {
  width: PRINT_CHART.widthIn * PRINT_CHART.unitsPerIn,
  height: PRINT_CHART.heightIn * PRINT_CHART.unitsPerIn,
  padding: PRINT_CHART.padding,
};

export function createRaTicks(step = 1) {
  const ticks = [];
  for (let hour = 0; hour <= 24; hour += step) ticks.push(hour);
  return ticks;
}

export function createRaMinuteTicks(step = 5) {
  const ticks = [];
  for (let minute = 0; minute <= 24 * 60; minute += step) {
    ticks.push({
      hour: minute / 60,
      minute,
      isHour: minute % 60 === 0,
      isMedium: minute % 20 === 0,
    });
  }
  return ticks;
}

export function createDecTicks(step = 30) {
  const ticks = [];
  for (let dec = -90; dec <= 90; dec += step) ticks.push(dec);
  return ticks;
}

export function createDecTickMarks(step = 5) {
  const ticks = [];
  for (let dec = -90; dec <= 90; dec += step) {
    ticks.push({
      dec,
      isMajor: dec % 10 === 0,
    });
  }
  return ticks;
}

export function pointForStar(star, width = DEFAULT_CHART.width, height = DEFAULT_CHART.height, padding = DEFAULT_CHART.padding) {
  return pointForCoordinates(star.ra, star.dec, width, height, padding);
}

export function pointForCoordinates(ra, dec, width = DEFAULT_CHART.width, height = DEFAULT_CHART.height, padding = DEFAULT_CHART.padding) {
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  return {
    x: padding + ((24 - ra) / 24) * plotWidth,
    y: padding + ((90 - dec) / 180) * plotHeight,
  };
}

export function createHipStarMap(stars) {
  const map = new Map();

  for (const star of stars) {
    if (Number.isInteger(star.hip)) map.set(star.hip, star);
  }

  return map;
}

function interpolateDeclination(start, end, targetRa) {
  const t = (targetRa - start.ra) / (end.ra - start.ra);
  return start.dec + (end.dec - start.dec) * t;
}

function segmentPiecesForStars(start, end, width, height, padding) {
  const deltaRa = Math.abs(start.ra - end.ra);
  const startPoint = pointForStar(start, width, height, padding);
  const endPoint = pointForStar(end, width, height, padding);

  if (deltaRa <= 12) return [[startPoint, endPoint]];

  if (start.ra < end.ra) {
    const wrappedEnd = { ...end, ra: end.ra - 24 };
    const seamDec = interpolateDeclination(start, wrappedEnd, 0);
    return [
      [startPoint, pointForCoordinates(0, seamDec, width, height, padding)],
      [pointForCoordinates(24, seamDec, width, height, padding), endPoint],
    ];
  }

  const wrappedEnd = { ...end, ra: end.ra + 24 };
  const seamDec = interpolateDeclination(start, wrappedEnd, 24);
  return [
    [startPoint, pointForCoordinates(24, seamDec, width, height, padding)],
    [pointForCoordinates(0, seamDec, width, height, padding), endPoint],
  ];
}

export function constellationLineSegments(path, starsByHip, width = DEFAULT_CHART.width, height = DEFAULT_CHART.height, padding = DEFAULT_CHART.padding) {
  const segments = [];

  for (let index = 1; index < path.hips.length; index += 1) {
    const start = starsByHip.get(path.hips[index - 1]);
    const end = starsByHip.get(path.hips[index]);
    if (!start || !end) continue;

    segments.push(...segmentPiecesForStars(start, end, width, height, padding));
  }

  return segments;
}

export function colorForStar(star) {
  return '#f2f2f2';
}

export const DEFAULT_MAG_LIMIT = 6.5;
export const MIN_STAR_RADIUS = 0.75;
export const MAX_STAR_RADIUS = 3;
export const DEFAULT_RADIUS_COMPRESSION = 1.2;
export const RADIUS_TAIL_PORTION = 0.2;

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function emphasizeRadiusTails(value, compression) {
  const tailExponent = 1 + Math.min(1.5, Math.max(0, compression * 0.75));

  if (value < RADIUS_TAIL_PORTION) {
    return RADIUS_TAIL_PORTION * (value / RADIUS_TAIL_PORTION) ** tailExponent;
  }

  if (value > 1 - RADIUS_TAIL_PORTION) {
    return 1 - RADIUS_TAIL_PORTION * ((1 - value) / RADIUS_TAIL_PORTION) ** tailExponent;
  }

  return value;
}

export function starRadiusForMagnitude(magnitude, compression = DEFAULT_RADIUS_COMPRESSION) {
  const magnitudeRange = DEFAULT_MAG_LIMIT + 1.5;
  const brightness = Math.min(1, Math.max(0, (DEFAULT_MAG_LIMIT - magnitude) / magnitudeRange));
  const radiusRange = MAX_STAR_RADIUS - MIN_STAR_RADIUS;

  if (compression <= 0) return MIN_STAR_RADIUS + brightness * radiusRange;

  const emphasizedBrightness = emphasizeRadiusTails(brightness, compression);
  const curveBlend = Math.min(1, compression / 3);
  const curvedBrightness = emphasizedBrightness * (1 - curveBlend) + smoothstep(emphasizedBrightness) * curveBlend;
  return MIN_STAR_RADIUS + curvedBrightness * radiusRange;
}

export function starRadius(star, scale = 1, compression = DEFAULT_RADIUS_COMPRESSION) {
  return starRadiusForMagnitude(star.mag, compression) * scale;
}

export function labelForStar(star) {
  return star.proper || star.bf || `HYG ${star.id}`;
}

export function shouldLabelStar(star) {
  return Boolean(star.proper) || star.mag <= 2.15;
}

export function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
