import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Apex Legends Recoil Strafe Trainer',
    short_name: 'Recoil Strafe Trainer',
    description:
      'Improve your recoil strafing in Apex Legends with audio cues and visual indicators.',
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


