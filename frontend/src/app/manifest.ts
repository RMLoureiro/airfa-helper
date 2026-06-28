import type { MetadataRoute } from 'next';

// Web App Manifest — makes Airfa installable as a PWA ("download the app") on
// mobile home screens. Served at /manifest.webmanifest by Next.js.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Airfa — Banda Filarmónica',
    short_name: 'Airfa',
    description: 'Sistema de gestão da Banda Filarmónica da Airfa',
    lang: 'pt-PT',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0E0E10',
    theme_color: '#0E0E10',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
