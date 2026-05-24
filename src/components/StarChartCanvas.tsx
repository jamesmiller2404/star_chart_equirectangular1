'use client';

import { useEffect, useRef, useState } from 'react';
import {
  colorForStar,
  createDecTickMarks,
  createDecTicks,
  createRaMinuteTicks,
  createRaTicks,
  labelForStar,
  pointForStar,
  starOpacity,
  starRadius,
} from '@/src/chart/chart-model.mjs';
import type { StarDataset, StarRecord } from '@/src/data/load-stars';

type HoverTarget = {
  x: number;
  y: number;
  radius: number;
  star: StarRecord;
};

export function StarChartCanvas({ dataUrl }: { dataUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hoverTargets = useRef<HoverTarget[]>([]);
  const [dataset, setDataset] = useState<StarDataset | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      drawGrid(context, width, height, padding);

      for (let i = dataset.stars.length - 1; i >= 0; i -= 1) {
        const star = dataset.stars[i];
        const point = pointForStar(star, width, height, padding);
        const radius = starRadius(star, dpr);

        context.beginPath();
        context.fillStyle = colorForStar(star);
        context.globalAlpha = starOpacity(star);
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();

        if (star.mag <= 4.2 || star.proper) {
          hoverTargets.current.push({
            ...point,
            radius: Math.max(radius + 6 * dpr, 8 * dpr),
            star,
          });
        }
      }

      context.globalAlpha = 1;
    }

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [dataset]);

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
        <span className="meta-pill">Magnitude &lt;= 7.5</span>
        <span className="meta-pill">RA 0h to 24h right-to-left</span>
        {error ? <span className="meta-pill">{error}</span> : null}
      </div>

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

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number, padding: number) {
  context.strokeStyle = 'rgba(114, 130, 151, 0.34)';
  context.fillStyle = 'rgba(210, 220, 235, 0.78)';
  context.lineWidth = 1;
  context.font = `${Math.max(11, width / 120)}px system-ui, sans-serif`;

  for (const tick of createRaMinuteTicks(5)) {
    if (tick.isHour) continue;
    const x = padding + ((24 - tick.hour) / 24) * (width - padding * 2);
    const tickLength = tick.isMedium ? 12 : 6;

    context.beginPath();
    context.strokeStyle = tick.isMedium ? 'rgba(114, 130, 151, 0.48)' : 'rgba(114, 130, 151, 0.3)';
    context.moveTo(x, padding);
    context.lineTo(x, padding + tickLength);
    context.moveTo(x, height - padding);
    context.lineTo(x, height - padding - tickLength);
    context.stroke();
  }

  context.strokeStyle = 'rgba(114, 130, 151, 0.38)';
  for (const hour of createRaTicks(1)) {
    const x = padding + ((24 - hour) / 24) * (width - padding * 2);
    context.beginPath();
    context.moveTo(x, padding);
    context.lineTo(x, height - padding);
    context.stroke();
    context.textAlign = 'center';
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

  context.strokeStyle = 'rgba(114, 130, 151, 0.34)';
  for (const dec of createDecTicks(10)) {
    const y = padding + ((90 - dec) / 180) * (height - padding * 2);
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    context.fillText(`${dec > 0 ? '+' : ''}${dec}`, padding - 8, y);
  }
}
