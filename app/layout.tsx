import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import './globals.css';
import { PwaProvider } from '@/components/pwa/PwaProvider';
import { AndroidAppPinningNotice } from '@/components/pwa/AndroidAppPinningNotice';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'TeachAlike - Learn. Listen. Grow.',
  description:
    'TeachAlike is a reading-companion app for children: guided reading sessions, book-linked mini-games, and family voice profiles.',
  applicationName: 'TeachAlike',
  manifest: '/manifest.webmanifest',
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TeachAlike',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F8FC' },
    { media: '(prefers-color-scheme: dark)', color: '#061D2E' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Script id="theme-init" strategy="beforeInteractive">
        {`(() => {
          try {
            const storedTheme = localStorage.getItem('teachalike_theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const isDark = storedTheme ? storedTheme === 'dark' : prefersDark;
            document.documentElement.classList.toggle('dark', isDark);
            document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
          } catch (_) {}
        })()`}
      </Script>
      <body>
        <PwaProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <AndroidAppPinningNotice />
        </PwaProvider>
      </body>
    </html>
  );
}
