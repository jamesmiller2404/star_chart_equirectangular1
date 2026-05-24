import Link from 'next/link';
import { StarChartCanvas } from '@/src/components/StarChartCanvas';

export default function HomePage() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="title-block">
          <h1>HYG Star Chart</h1>
          <p>Canvas preview backed by the same projection model used for print export.</p>
        </div>
        <nav className="nav-actions" aria-label="Chart views">
          <Link href="/" aria-current="page">
            Preview
          </Link>
          <Link href="/print">Print</Link>
        </nav>
      </header>

      <StarChartCanvas dataUrl="/data/stars-mag-6_5.json" />
    </main>
  );
}
