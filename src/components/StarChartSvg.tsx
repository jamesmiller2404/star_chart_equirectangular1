import {
  MAIN_STAR_CHART_ID,
  getMainStarChart,
  getPolarStarChart,
  normalizeStarChartId,
  renderInsetStarChartSvg,
  renderMainStarChartSvg,
  renderPolarStarChartSvg,
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
  const mainChart = getMainStarChart(normalizedChartId);
  if (mainChart && !dataset) {
    throw new Error('Main star chart rendering requires a HYG star dataset.');
  }
  if (getPolarStarChart(normalizedChartId) && !dataset) {
    throw new Error('Polar star chart rendering requires a HYG star dataset.');
  }

  const { svg } = mainChart
    ? renderMainStarChartSvg(dataset, { chart: mainChart })
    : getPolarStarChart(normalizedChartId)
      ? renderPolarStarChartSvg(normalizedChartId, dataset)
      : renderInsetStarChartSvg(normalizedChartId, insetStars);

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
