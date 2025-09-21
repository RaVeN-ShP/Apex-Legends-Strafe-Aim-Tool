import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const size = {
  width: 1200,
  height: 628,
};

export const contentType = 'image/png';

export default function TwitterImage() {
  const title = 'Apex Legends Recoil Strafe Trainer';
  const bannerPath = join(process.cwd(), 'public', 'banner.png');
  const bannerDataUrl = `data:image/png;base64,${readFileSync(bannerPath).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          position: 'relative',
        }}
      >
        <img
          src={bannerDataUrl}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        <div
          style={{
            position: 'relative',
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            color: '#fff',
            padding: '60px',
            zIndex: 2,
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              padding: '24px 28px',
              borderRadius: 12,
              maxWidth: '90%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{title}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}


