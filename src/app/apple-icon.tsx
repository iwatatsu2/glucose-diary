import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
          borderRadius: 36,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 64, display: 'flex' }}>💉</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginTop: 4 }}>Glucose</div>
        <div style={{ fontSize: 14, color: '#93c5fd' }}>Diary</div>
      </div>
    ),
    { ...size }
  )
}
