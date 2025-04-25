import { MetadataRoute } from 'next'

// This manifest allows the application to be installed as a PWA
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MatLinks - BJJ Academy Management',
    short_name: 'MatLinks',
    description: 'Complete management solution for Brazilian Jiu-Jitsu academies',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    orientation: 'portrait',
    prefer_related_applications: false,
    related_applications: [],
    categories: ['education', 'sports', 'fitness']
  }
} 