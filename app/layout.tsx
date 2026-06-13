import './globals.css';
import type { Metadata } from 'next';
import { Fraunces, Newsreader, Caveat } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  style: ['normal', 'italic'],
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-hand',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Baby Uebe's Coloring Book",
  description: 'A collaborative A–Z coloring book for our baby shower.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${newsreader.variable} ${caveat.variable}`}>
      <body className="min-h-screen bg-cream font-body text-ink antialiased">{children}</body>
    </html>
  );
}
