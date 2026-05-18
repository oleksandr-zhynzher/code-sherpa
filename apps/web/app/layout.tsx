import './globals.css';

import type { Metadata } from 'next';
import { Geist_Mono, Inter, Playfair_Display } from 'next/font/google';
import type { ReactNode } from 'react';

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-data',
  display: 'swap',
});

export const metadata: Metadata = {
  description: 'AI-tutored algorithms practice platform.',
  title: 'code-sherpa',
};

export default function RootLayout({ children }: Readonly<{ readonly children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${inter.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
