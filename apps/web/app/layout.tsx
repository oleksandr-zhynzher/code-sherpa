import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  description: 'AI-tutored algorithms practice platform.',
  title: 'code-sherpa',
};

export default function RootLayout({ children }: Readonly<{ readonly children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
