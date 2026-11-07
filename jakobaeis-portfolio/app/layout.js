import './globals.css';
import { UnifrakturMaguntia, Archivo_Narrow } from 'next/font/google';
import { SITE_NAME } from '../lib/site';

const display = UnifrakturMaguntia({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
const body = Archivo_Narrow({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const base = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(base),
  title: `${SITE_NAME} | graphic design`,
  description: 'Posters, covers and edits by jakobaeis.',
  openGraph: {
    title: `${SITE_NAME} | graphic design`,
    description: 'Posters, covers and edits by jakobaeis.',
    images: ['/artworks/dont-be-dumb.webp'],
  },
};

export const viewport = { themeColor: '#a3a6a6' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
