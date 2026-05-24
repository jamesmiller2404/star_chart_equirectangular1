import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HYG Star Chart',
  description: 'Interactive and print-oriented star chart generated from the HYG catalog.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
