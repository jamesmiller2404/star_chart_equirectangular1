import Link from 'next/link';
import { loadStarDataset } from '@/src/data/load-stars';
import { loadGaiaInsetStars } from '@/src/data/load-gaia-inset-stars';
import { StarChartSvg } from '@/src/components/StarChartSvg';
import { INSET_STAR_CHARTS, MAIN_STAR_CHART_ID, normalizeStarChartId } from '@/src/chart/render-svg.mjs';

type PrintPageProps = {
  searchParams?: Promise<{
    chart?: string;
  }>;
};

export default async function PrintPage({ searchParams }: PrintPageProps) {
  const params = await searchParams;
  const chartId = normalizeStarChartId(params?.chart) ?? MAIN_STAR_CHART_ID;
  const isMainChart = chartId === MAIN_STAR_CHART_ID;
  const dataset = isMainChart ? await loadStarDataset() : undefined;
  const insetStars = isMainChart ? [] : await loadGaiaInsetStars(chartId);
  const chartTitle = isMainChart ? 'Main Star Chart' : `${INSET_STAR_CHARTS[chartId].title} Inset`;
  const chartSize = isMainChart ? '24in x 12in' : 'standalone inset SVG';

  return (
    <main className="print-shell">
      <header className="app-header">
        <div className="title-block">
          <h1>Print Layout</h1>
          <p>
            {chartTitle}, {chartSize}.
          </p>
        </div>
        <nav className="nav-actions" aria-label="Chart views">
          <Link href="/">Preview</Link>
          <Link href="/print?chart=main" aria-current={chartId === MAIN_STAR_CHART_ID ? 'page' : undefined}>
            Main
          </Link>
          <Link href="/print?chart=pleiades" aria-current={chartId === 'pleiades' ? 'page' : undefined}>
            Pleiades
          </Link>
          <Link href="/print?chart=scorpio" aria-current={chartId === 'scorpio' ? 'page' : undefined}>
            Scorpio
          </Link>
          <Link href="/print?chart=lyra" aria-current={chartId === 'lyra' ? 'page' : undefined}>
            Lyra
          </Link>
        </nav>
      </header>

      <div className="meta-row">
        {dataset ? <span className="meta-pill">{dataset.count.toLocaleString()} stars</span> : null}
        {dataset?.constellations ? <span className="meta-pill">{dataset.constellations.count} constellations</span> : null}
        {!dataset ? <span className="meta-pill">{insetStars.length.toLocaleString()} Gaia DR3 sources</span> : null}
        <span className="meta-pill">Editable SVG labels</span>
      </div>

      <section className="print-preview" aria-label="SVG print preview">
        <StarChartSvg chartId={chartId} dataset={dataset} insetStars={insetStars} />
      </section>
    </main>
  );
}
