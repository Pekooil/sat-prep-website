import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 38,
          color: 'white',
          background: 'linear-gradient(145deg, #8a7cff, #5643ea)',
          fontFamily: 'Arial, sans-serif',
          fontSize: 104,
          fontWeight: 800,
        }}
      >
        S
      </div>
    ),
    size,
  )
}
