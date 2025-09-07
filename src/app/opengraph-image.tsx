import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpengraphImage() {
  const title = 'Apex Legends Recoil Strafe Trainer';
  const subtitle = 'Master recoil strafing in Apex Legends with audio cues, visual indicators, and a popout timing guide.';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1f2937 0%, #0b0f19 100%)',
          color: '#fff',
          padding: '60px',
        }}
      >
        <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 28, opacity: 0.85, marginTop: 12 }}>{subtitle}</div>
        <div style={{ marginTop: 28, fontSize: 18, opacity: 0.8 }}>apex strafe control timer</div>
      </div>
    ),
    {
      ...size,
    }
  );
}


