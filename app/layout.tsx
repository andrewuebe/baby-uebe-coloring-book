import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Baby Uebe's Coloring Book",
  description: 'A collaborative A–Z coloring book for our baby shower.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-ink">{children}</body>
    </html>
  );
}
