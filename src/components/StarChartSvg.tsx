import {
  MAIN_STAR_CHART_ID,
  normalizeStarChartId,
  renderInsetStarChartSvg,
  renderMainStarChartSvg,
} from '@/src/chart/render-svg.mjs';
import type { GaiaInsetStarRecord } from '@/src/data/load-gaia-inset-stars';
import type { StarDataset } from '@/src/data/load-stars';

type StarChartSvgProps = {
  chartId?: string;
  dataset?: StarDataset;
  insetStars?: GaiaInsetStarRecord[];
};

export function StarChartSvg({ chartId = MAIN_STAR_CHART_ID, dataset, insetStars = [] }: StarChartSvgProps) {
  const normalizedChartId = normalizeStarChartId(chartId);
  if (!normalizedChartId) throw new Error(`Unknown chart "${chartId}".`);
  if (normalizedChartId === MAIN_STAR_CHART_ID && !dataset) {
    throw new Error('Main star chart rendering requires a HYG star dataset.');
  }

  const { svg } = normalizedChartId === MAIN_STAR_CHART_ID
    ? renderMainStarChartSvg(dataset)
    : renderInsetStarChartSvg(normalizedChartId, insetStars);

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
