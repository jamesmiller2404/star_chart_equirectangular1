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
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  return {
    x: padding + ((24 - star.ra) / 24) * plotWidth,
    y: padding + ((90 - star.dec) / 180) * plotHeight,
  };
}

export function colorForStar(star) {
  if (star.ci === null || star.ci === undefined) return '#e8eeff';
  if (star.ci < -0.1) return '#b9d2ff';
  if (star.ci < 0.35) return '#dae6ff';
  if (star.ci < 0.8) return '#fff4d2';
  if (star.ci < 1.4) return '#ffd296';
  return '#ffb274';
}

export function starRadius(star, scale = 1) {
  return Math.max(0.65, (8 - star.mag) * 0.78) * scale;
}

export function starOpacity(star) {
  return Math.min(1, 0.32 + (7.5 - star.mag) / 5.5);
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
