import { renderStarChartSvg } from '@/src/chart/render-svg.mjs';
import type { StarDataset } from '@/src/data/load-stars';

export function StarChartSvg({ dataset }: { dataset: StarDataset }) {
  const { svg } = renderStarChartSvg(dataset);
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
