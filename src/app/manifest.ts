import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Apex Legends Recoil Strafe Trainer',
    short_name: 'Apex Legends Trainer',
    description:
      'Improve your recoil strafing in Apex Legends with audio cues and visual indicators. The popout timing guide helps you master left and right strafes while practicing in the training range.',
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


