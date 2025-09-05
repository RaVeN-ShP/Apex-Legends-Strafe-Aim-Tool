import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Apex Legends Strafe Aiming Tool',
    short_name: 'Apex Strafe Aim Tool',
    description:
      'Dial in your strafe aim for Apex with clean audio cues and clear A/D direction visuals. Practice tool inspired by ahn99.',
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


