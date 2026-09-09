import { ImageResponse } from 'next/og'

export const alt = 'SaturnPath — Free personalized SAT study planning and adaptive practice'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          padding: '64px 72px',
          color: '#17324d',
          background: 'linear-gradient(135deg, #f8f9ff 0%, #eef0ff 55%, #e6fff7 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', width: 420, height: 420, top: -190, right: -80, borderRadius: 999, background: 'rgba(104, 87, 246, .17)' }} />
        <div style={{ position: 'absolute', width: 330, height: 330, bottom: -200, left: 160, borderRadius: 999, background: 'rgba(53, 207, 164, .15)' }} />
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 58, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 18, color: 'white', background: '#6857f6', fontSize: 34 }}>S</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1.2px' }}>SaturnPath</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 870 }}>
            <div style={{ color: '#5643ea', fontSize: 22, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase' }}>Free adaptive SAT prep</div>
            <div style={{ marginTop: 17, fontSize: 70, lineHeight: 1.02, fontWeight: 800, letterSpacing: '-4px' }}>Your SAT study plan should adapt to you.</div>
            <div style={{ marginTop: 22, color: '#60758a', fontSize: 27 }}>Plan smarter. Practice what matters. Review mistakes.</div>
          </div>
          <div style={{ display: 'flex', gap: 24, color: '#60758a', fontSize: 20, fontWeight: 700 }}>
            <span>No account to preview</span><span>•</span><span>No credit card</span><span>•</span><span>$0</span>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
