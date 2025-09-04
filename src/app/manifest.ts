import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Apex Legends Strafe Aiming Tool',
    short_name: 'Strafe Tool',
    description:
      'Master strafe aiming techniques in Apex Legends with audio cues and perfect timing. Learn weapon-specific patterns for the firing range.',
    start_url: '/',
    display: 'standalone',
    background_color: '#111827',
    theme_color: '#111827',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}


