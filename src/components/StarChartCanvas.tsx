'use client';

import { useEffect, useRef, useState } from 'react';
import {
  colorForStar,
  BRIGHT_STAR_MAGNITUDE_LIMIT,
  CONSTELLATION_BOUNDARY_OPACITY,
  CONSTELLATION_BOUNDARY_WIDTH_PT,
  CONSTELLATION_LINE_OPACITY,
  CONSTELLATION_LINE_WIDTH_PT,
  CONSTELLATION_LABEL_OPACITY,
  constellationBoundaryPaths,
  constellationLabelPosition,
  constellationLineSegments,
  createEclipticCoordinates,
  createHipStarMap,
  createDecTickMarks,
  createDecTicks,
  createRaMinuteTicks,
  createRaTicks,
  DEFAULT_MAG_LIMIT,
  DEFAULT_RADIUS_COMPRESSION,
  DIM_STAR_OPACITY,
  GRID_OPACITY,
  labelForStar,
  MAGNITUDE_SCALE_TICKS,
  pointForCoordinates,
  pointForStar,
  renderedStarRadiusScaleForMagnitude,
  starRadius,
  starRadiusForMagnitude,
} from '@/src/chart/chart-model.mjs';
import type { StarDataset, StarRecord } from '@/src/data/load-stars';

type HoverTarget = {
  x: number;
  y: number;
  radius: number;
  star: StarRecord;
};

const CSS_PIXELS_PER_POINT = 96 / 72;
const RA_DEC_LABEL_FONT_POINTS = 10;
const RA_DEC_LABEL_FILL = '#ffffff';
const RA_DEC_LABEL_FONT_FAMILY = '"Cinzel Medium", Cinzel, serif';

export function StarChartCanvas({ dataUrl }: { dataUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hoverTargets = useRef<HoverTarget[]>([]);
  const [dataset, setDataset] = useState<StarDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [radiusCompression, setRadiusCompression] = useState(DEFAULT_RADIUS_COMPRESSION);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error(`Unable to load ${dataUrl}`);
        const nextDataset = (await response.json()) as StarDataset;
        if (!cancelled) setDataset(nextDataset);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load star data');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  useEffect(() => {
    if (!dataset || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    function draw() {
      const bounds = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.round(bounds.width * dpr);
      const height = Math.round(bounds.height * dpr);
      const padding = Math.max(34, Math.round(width * 0.035));

      canvas.width = width;
      canvas.height = height;
      hoverTargets.current = [];

      context.fillStyle = '#05070b';
      context.fillRect(0, 0, width, height);

      drawGrid(context, width, height, padding, dpr);
      drawCoordinateReferenceLines(context, width, height, padding, dpr);
      drawConstellationBoundaries(context, width, height, padding, dpr);
      drawConstellationLines(context, dataset, width, height, padding, dpr);
      drawConstellationLabels(context, dataset, width, height, padding, dpr);

      for (let i = dataset.stars.length - 1; i >= 0; i -= 1) {
        const star = dataset.stars[i];
        const point = pointForStar(star, width, height, padding);
        const radius = starRadius(star, dpr * renderedStarRadiusScaleForMagnitude(star.mag), radiusCompression);
        const outline = Math.max(0.08 * dpr, Math.min(0.18 * dpr, radius * 0.14));

        context.beginPath();
        context.globalAlpha = star.mag > BRIGHT_STAR_MAGNITUDE_LIMIT ? DIM_STAR_OPACITY : 1;
        context.fillStyle = colorForStar(star);
        context.strokeStyle = '#05070b';
        context.lineWidth = outline;
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.globalAlpha = 1;

        if (star.mag <= BRIGHT_STAR_MAGNITUDE_LIMIT || star.proper) {
          hoverTargets.current.push({
            ...point,
            radius: Math.max(radius + 6 * dpr, 8 * dpr),
            star,
          });
        }
      }

      drawMagnitudeScale(context, width, height, padding, dpr, radiusCompression);
    }

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [dataset, radiusCompression]);

  function showNearest(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !tooltip) return;

    const bounds = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (event.clientX - bounds.left) * dpr;
    const y = (event.clientY - bounds.top) * dpr;
    let nearest: StarRecord | null = null;
    let bestDistance = Infinity;

    for (const target of hoverTargets.current) {
      const distance = Math.hypot(target.x - x, target.y - y);
      if (distance < target.radius && distance < bestDistance) {
        nearest = target.star;
        bestDistance = distance;
      }
    }

    if (!nearest) {
      tooltip.style.opacity = '0';
      return;
    }

    tooltip.innerHTML = `<strong>${labelForStar(nearest)}</strong>mag ${nearest.mag.toFixed(2)} · RA ${nearest.ra.toFixed(2)}h · Dec ${nearest.dec.toFixed(1)}°`;
    tooltip.style.opacity = '1';
    tooltip.style.left = `${event.clientX - bounds.left}px`;
    tooltip.style.top = `${event.clientY - bounds.top}px`;
  }

  return (
    <>
      <div className="meta-row">
        <span className="meta-pill">{dataset ? `${dataset.count.toLocaleString()} stars` : 'Loading stars...'}</span>
        <span className="meta-pill">Magnitude &lt;= {DEFAULT_MAG_LIMIT}</span>
        {dataset?.constellations ? <span className="meta-pill">{dataset.constellations.count} constellations</span> : null}
        <span className="meta-pill">RA 0h to 24h right-to-left</span>
        {error ? <span className="meta-pill">{error}</span> : null}
      </div>

      <section className="radius-control" aria-label="Star radius curve controls">
        <div className="radius-slider">
          <label htmlFor="radius-compression">Radius curve</label>
          <div className="range-row">
            <input
              id="radius-compression"
              type="range"
              min="0"
              max="3"
              step="0.01"
              value={radiusCompression}
              onChange={(event) => setRadiusCompression(Number(event.target.value))}
            />
            <output htmlFor="radius-compression">{radiusCompression.toFixed(2)}</output>
          </div>
        </div>
        <RadiusCurveGraph compression={radiusCompression} />
      </section>

      <div className="chart-frame">
        <canvas
          ref={canvasRef}
          aria-label="All-sky star chart from HYG v4.2"
          onMouseMove={showNearest}
          onMouseLeave={() => {
            if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
          }}
        />
        <div className="tooltip" ref={tooltipRef} />
      </div>

      <footer className="footer-row">
        <span>Projection: RA 0h to 24h right-to-left, declination +90 to -90.</span>
        <span>Data: HYG v4.2, CC-BY-SA 4.0.</span>
      </footer>
    </>
  );
}

function RadiusCurveGraph({ compression }: { compression: number }) {
  const width = 240;
  const height = 88;
  const padding = 12;
  const magnitudes = [-1.5, 0, 2, 4, 6, DEFAULT_MAG_LIMIT];
  const maxLinearRadius = starRadiusForMagnitude(-1.5, 0);
  const points = Array.from({ length: 80 }, (_, index) => {
    const magnitude = -1.5 + (index / 79) * (DEFAULT_MAG_LIMIT + 1.5);
    const x = padding + (index / 79) * (width - padding * 2);
    const y = height - padding - (starRadiusForMagnitude(magnitude, compression) / maxLinearRadius) * (height - padding * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const linearPoints = Array.from({ length: 24 }, (_, index) => {
    const magnitude = -1.5 + (index / 23) * (DEFAULT_MAG_LIMIT + 1.5);
    const x = padding + (index / 23) * (width - padding * 2);
    const y = height - padding - (starRadiusForMagnitude(magnitude, 0) / maxLinearRadius) * (height - padding * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

  return (
    <svg className="radius-curve" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Radius curve graph">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
      <polyline className="radius-curve-linear" points={linearPoints} />
      <polyline className="radius-curve-active" points={points} />
      {magnitudes.map((magnitude) => {
        const x = padding + ((magnitude + 1.5) / (DEFAULT_MAG_LIMIT + 1.5)) * (width - padding * 2);
        const y = height - padding - (starRadiusForMagnitude(magnitude, compression) / maxLinearRadius) * (height - padding * 2);
        return <circle key={magnitude} cx={x} cy={y} r="2.5" />;
      })}
    </svg>
  );
}

function drawConstellationBoundaries(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
  dpr: number,
) {
  const cssPixelsPerPoint = 96 / 72;

  context.save();
  context.strokeStyle = `rgba(117, 213, 169, ${CONSTELLATION_BOUNDARY_OPACITY})`;
  context.lineWidth = CONSTELLATION_BOUNDARY_WIDTH_PT * cssPixelsPerPoint * dpr;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.setLineDash([6 * dpr, 7 * dpr]);

  for (const boundary of constellationBoundaryPaths(width, height, padding)) {
    for (const path of boundary.paths) {
      if (path.length < 2) continue;

      context.beginPath();
      context.moveTo(path[0].x, path[0].y);

      for (let index = 1; index < path.length; index += 1) {
        context.lineTo(path[index].x, path[index].y);
      }

      context.stroke();
    }
  }

  context.restore();
}

function drawConstellationLines(
  context: CanvasRenderingContext2D,
  dataset: StarDataset,
  width: number,
  height: number,
  padding: number,
  dpr: number,
) {
  if (!dataset.constellations?.lines?.length) return;

  const starsByHip = createHipStarMap(dataset.stars);
  const cssPixelsPerPoint = 96 / 72;

  context.save();
  context.strokeStyle = `rgba(184, 184, 184, ${CONSTELLATION_LINE_OPACITY})`;
  context.lineWidth = CONSTELLATION_LINE_WIDTH_PT * cssPixelsPerPoint * dpr;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const constellation of dataset.constellations.lines) {
    for (const path of constellation.paths) {
      context.beginPath();

      for (const [start, end] of constellationLineSegments(path, starsByHip, width, height, padding)) {
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
      }

      context.stroke();
    }
  }

  context.restore();
}

function drawConstellationLabels(
  context: CanvasRenderingContext2D,
  dataset: StarDataset,
  width: number,
  height: number,
  padding: number,
  dpr: number,
) {
  if (!dataset.constellations?.lines?.length) return;

  const starsByHip = createHipStarMap(dataset.stars);

  context.save();
  context.fillStyle = `rgba(174, 184, 199, ${CONSTELLATION_LABEL_OPACITY})`;
  context.font = `700 ${Math.max(10, 11 * dpr)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  for (const constellation of dataset.constellations.lines) {
    const point = constellationLabelPosition(constellation, starsByHip, width, height, padding);
    if (!point) continue;
    context.fillText(constellation.iau, point.x, point.y);
  }

  context.restore();
}

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number, padding: number, dpr: number) {
  context.strokeStyle = `rgba(114, 130, 151, ${GRID_OPACITY})`;
  context.fillStyle = RA_DEC_LABEL_FILL;
  context.lineWidth = 1;
  context.font = `500 ${RA_DEC_LABEL_FONT_POINTS * CSS_PIXELS_PER_POINT * dpr}px ${RA_DEC_LABEL_FONT_FAMILY}`;

  for (const tick of createRaMinuteTicks(5)) {
    if (tick.isHour) continue;
    const x = padding + ((24 - tick.hour) / 24) * (width - padding * 2);
    const tickLength = tick.isMedium ? 12 : 6;

    context.beginPath();
    context.strokeStyle = tick.isMedium ? `rgba(114, 130, 151, ${GRID_OPACITY})` : 'rgba(114, 130, 151, 0.3)';
    context.moveTo(x, padding);
    context.lineTo(x, padding + tickLength);
    context.moveTo(x, height - padding);
    context.lineTo(x, height - padding - tickLength);
    context.stroke();
  }

  context.strokeStyle = `rgba(114, 130, 151, ${GRID_OPACITY})`;
  for (const hour of createRaTicks(1)) {
    const x = padding + ((24 - hour) / 24) * (width - padding * 2);
    context.beginPath();
    context.moveTo(x, padding);
    context.lineTo(x, height - padding);
    context.stroke();
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.fillText(`${hour}h`, x, padding - 8);
    context.textBaseline = 'top';
    context.fillText(`${hour}h`, x, height - padding + 8);
  }

  for (const tick of createDecTickMarks(5)) {
    if (tick.isMajor) continue;
    const y = padding + ((90 - tick.dec) / 180) * (height - padding * 2);
    const tickLength = 6;

    context.beginPath();
    context.strokeStyle = 'rgba(114, 130, 151, 0.3)';
    context.moveTo(padding, y);
    context.lineTo(padding + tickLength, y);
    context.moveTo(width - padding, y);
    context.lineTo(width - padding - tickLength, y);
    context.stroke();
  }

  context.strokeStyle = `rgba(114, 130, 151, ${GRID_OPACITY})`;
  for (const dec of createDecTicks(10)) {
    const y = padding + ((90 - dec) / 180) * (height - padding * 2);
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    context.fillText(`${dec > 0 ? '+' : ''}${dec}`, padding - 8, y);
    context.textAlign = 'left';
    context.fillText(`${dec > 0 ? '+' : ''}${dec}`, width - padding + 8, y);
  }
}

function drawCoordinateReferenceLines(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
  dpr: number,
) {
  const eclipticCoordinates = createEclipticCoordinates();
  const vernalEquinox = pointForCoordinates(0, 0, width, height, padding);
  const cssPixelsPerPoint = 96 / 72;

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';

  context.strokeStyle = `rgba(184, 184, 184, ${CONSTELLATION_LINE_OPACITY})`;
  context.lineWidth = CONSTELLATION_LINE_WIDTH_PT * cssPixelsPerPoint * dpr;
  context.setLineDash([14 * dpr, 9 * dpr]);
  context.beginPath();
  eclipticCoordinates.forEach((coordinate, index) => {
    const point = pointForCoordinates(coordinate.ra, coordinate.dec, width, height, padding);
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.stroke();

  context.setLineDash([]);
  context.fillStyle = 'rgba(174, 184, 199, 0.9)';
  context.strokeStyle = '#05070b';
  context.lineWidth = Math.max(1, 1.2 * dpr);
  context.beginPath();
  context.arc(vernalEquinox.x, vernalEquinox.y, 4.2 * dpr, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.restore();
}

function drawMagnitudeScale(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
  dpr: number,
  radiusCompression: number,
) {
  const scaleWidth = Math.min(360 * dpr, Math.max(240 * dpr, width * 0.28));
  const xStart = Math.max(padding, width - padding - scaleWidth);
  const xEnd = width - padding;
  const y = height - Math.max(16 * dpr, padding * 0.34);
  const labelY = y + 12 * dpr;
  const titleY = y - 10 * dpr;
  const labelFontSize = Math.max(9 * dpr, Math.min(12 * dpr, width / 150));
  const titleFontSize = Math.max(10 * dpr, Math.min(13 * dpr, width / 135));

  context.save();
  context.globalAlpha = 1;
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  context.fillStyle = 'rgba(238, 243, 248, 0.9)';
  context.font = `600 ${titleFontSize}px system-ui, sans-serif`;
  context.fillText('visual magnitude', xStart, titleY);

  context.strokeStyle = 'rgba(174, 184, 199, 0.42)';
  context.lineWidth = Math.max(1, dpr);
  context.beginPath();
  context.moveTo(xStart, y);
  context.lineTo(xEnd, y);
  context.stroke();

  context.fillStyle = 'rgba(174, 184, 199, 0.78)';
  context.font = `${labelFontSize}px system-ui, sans-serif`;
  context.textAlign = 'center';

  for (const magnitude of MAGNITUDE_SCALE_TICKS) {
    const x = xStart + ((magnitude + 1) / (DEFAULT_MAG_LIMIT + 1)) * scaleWidth;
    const radius = starRadiusForMagnitude(magnitude, radiusCompression)
      * renderedStarRadiusScaleForMagnitude(magnitude)
      * dpr;
    const outline = Math.max(0.08 * dpr, Math.min(0.18 * dpr, radius * 0.14));

    context.beginPath();
    context.fillStyle = '#f2f2f2';
    context.strokeStyle = '#05070b';
    context.lineWidth = outline;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = 'rgba(174, 184, 199, 0.78)';
    context.fillText(magnitude.toString(), x, labelY);
  }

  context.restore();
}
