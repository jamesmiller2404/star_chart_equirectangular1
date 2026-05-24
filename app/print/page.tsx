import Link from 'next/link';
import { loadStarDataset } from '@/src/data/load-stars';
import { StarChartSvg } from '@/src/components/StarChartSvg';
import { PRINT_CHART } from '@/src/chart/chart-model.mjs';

export default async function PrintPage() {
  const dataset = await loadStarDataset();

  return (
    <main className="print-shell">
      <header className="app-header">
        <div className="title-block">
          <h1>Print Layout</h1>
          <p>
            {PRINT_CHART.widthIn}in x {PRINT_CHART.heightIn}in SVG layout, HYG v4.2,
            magnitude &lt;= {dataset.magLimit}.
          </p>
        </div>
        <nav className="nav-actions" aria-label="Chart views">
          <Link href="/">Preview</Link>
          <Link href="/print" aria-current="page">
            Print
          </Link>
        </nav>
      </header>

      <div className="meta-row">
        <span className="meta-pill">{dataset.count.toLocaleString()} stars</span>
        <span className="meta-pill">Editable SVG text labels</span>
        <span className="meta-pill">Layered groups for Illustrator</span>
      </div>

      <section className="print-preview" aria-label="SVG print preview">
        <StarChartSvg dataset={dataset} />
      </section>
    </main>
  );
}
