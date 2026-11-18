import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://nutrisnap.vercel.app'),
  title: 'NutriSnap - AI Calorie & Macro Tracker',
  description: 'Snap your meal to instantly track calories, protein, carbs, and fats powered by Gemini AI.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NutriSnap',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    title: 'NutriSnap - AI Calorie & Macro Tracker',
    description: 'Snap your food to instantly get calories, protein, carbs, and fats in under 2 seconds.',
    url: 'https://nutrisnap.vercel.app',
    siteName: 'NutriSnap AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NutriSnap AI Calorie & Macro Tracker',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NutriSnap - AI Calorie & Macro Tracker',
    description: 'Instant calorie and macro recognition from photos powered by Gemini AI.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#090d16',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        <InstallPrompt />
        <main className="max-w-md mx-auto min-h-screen flex flex-col pb-24 shadow-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-x border-slate-900/50">
          {children}
        </main>
        <BottomNav />

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
