import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MolaYeri Yönetim Paneli',
  description: 'MolaYeri admin ve işletmeci yönetim arayüzü',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
