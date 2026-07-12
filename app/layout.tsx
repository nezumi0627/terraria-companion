import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { DotGothic16, Zen_Maru_Gothic } from 'next/font/google'
import './globals.css'

const pixel = DotGothic16({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const body = Zen_Maru_Gothic({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'テラリア コンパニオン',
  description:
    'Terrariaを遊ぶなら全員が入れておきたい進行管理アプリ。欲しいアイテムから必要な素材・ボス・設備・バイオームを自動で可視化し、進行状況を一元管理できます。',
  applicationName: 'テラリア コンパニオン',
  generator: 'nezumi0627',
  authors: [{ name: 'nezumi0627', url: 'https://github.com/nezumi0627' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'テラコン',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    other: [{ rel: 'mask-icon', url: '/icon.svg' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#1B1F1A',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

const themeScript = `
try {
  var t = localStorage.getItem('tc-theme') || 'dark';
  document.documentElement.classList.add(t === 'light' ? 'light' : 'dark');
} catch (e) {
  document.documentElement.classList.add('dark');
}
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${pixel.variable} ${body.variable} bg-background`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
