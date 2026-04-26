import { ImageResponse } from 'next/og'

export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
          borderRadius: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, display: 'flex' }}>💉</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginTop: 4 }}>Glucose</div>
        <div style={{ fontSize: 16, color: '#93c5fd' }}>Diary</div>
      </div>
    ),
    { ...size }
  )
}
