import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Games with Friends',
  description: 'Play classic board games with your friends in real time',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-cream-100 antialiased">{children}</body>
    </html>
  );
}
