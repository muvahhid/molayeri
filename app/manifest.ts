import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MolaYeri Yönetim Paneli',
    short_name: 'MolaYeri',
    description: 'MolaYeri admin ve işletmeci yönetim arayüzü',
    start_url: '/',
    display: 'standalone',
    background_color: '#050811',
    theme_color: '#050811',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
