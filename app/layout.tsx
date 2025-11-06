import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  display: 'swap',
  preload: false, // Only preload main font
});

export const metadata: Metadata = {
  title: 'SATTA MARKIT',
  description: 'SATTA MARKIT - Live Satta Results, Charts and Updates for GHAZIABAD2, FARIDABAD2, DESAWAR2 & GALI2',
  generator: 'SATTA MARKIT',
  keywords: ['satta markit', 'satta result', 'ghaziabad2', 'faridabad2', 'desawar2', 'gali2', 'satta chart', 'live satta'],
  authors: [{ name: 'SATTA MARKIT' }],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'SATTA MARKIT - Live Satta Results',
    description: 'Live Satta Results, Charts and Updates for GHAZIABAD2, FARIDABAD2, DESAWAR2 & GALI2',
    type: 'website',
    locale: 'en_IN',
    siteName: 'SATTA MARKIT',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SATTA MARKIT - Live Satta Results',
    description: 'Live Satta Results, Charts and Updates for GHAZIABAD2, FARIDABAD2, DESAWAR2 & GALI2',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${geist.className} antialiased`} suppressHydrationWarning={true}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
