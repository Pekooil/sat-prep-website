'use client'

import { useEffect, useState } from 'react'
import { PartyPopper } from 'lucide-react'

const SCORE_MIN = 400
const SCORE_MAX = 1600
const SCORE_RANGE = SCORE_MAX - SCORE_MIN

function pct(score: number) {
  const clamped = Math.min(Math.max(score, SCORE_MIN), SCORE_MAX)
  return ((clamped - SCORE_MIN) / SCORE_RANGE) * 100
}

const milestoneLabels = [400, 600, 800, 1000, 1200, 1400, 1600]

export function ScoreProgressBar({
  currentScore,
  targetScore,
}: {
  currentScore: number
  targetScore: number
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const fillPct = pct(currentScore)
  const targetPct = pct(targetScore)
  const ptsAway = Math.max(0, targetScore - currentScore)
  const animatedWidth = mounted ? fillPct : 0

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          Next milestone: {targetScore}
        </span>
        {ptsAway > 0 ? (
          <span className="sp-numeric text-xs font-medium text-[var(--text-body)]">
            {ptsAway} pts away
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold text-[var(--success)]">
            <PartyPopper className="h-3.5 w-3.5 shrink-0" />
            Goal reached!
          </span>
        )}
      </div>

      <div className="relative h-2 rounded-full bg-[var(--surface-sunken)] overflow-visible">
        {/* Purple glowing fill bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
          style={{
            width: `${animatedWidth}%`,
            transition: 'width 900ms cubic-bezier(0.16,1,0.3,1)',
            background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
            boxShadow: '0 0 8px 3px rgba(168,85,247,0.6), 0 0 20px 6px rgba(168,85,247,0.3)',
          }}
        >
          {/* Bright purple light core along the center */}
          <div
            className="absolute inset-x-0 rounded-full"
            style={{
              top: '15%',
              bottom: '15%',
              background: 'rgba(233,213,255,0.7)',
              filter: 'blur(1px)',
            }}
          />
        </div>

        {/* Gold glowing target mark */}
        {ptsAway > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 rounded-full"
            style={{
              width: '5.2px',
              left: `${targetPct}%`,
              background: 'linear-gradient(180deg, #ffe066 0%, #f5a623 100%)',
              boxShadow: '0 0 6px 2px rgba(255,196,0,0.85), 0 0 16px 4px rgba(255,160,0,0.5)',
            }}
          />
        )}

        {/* Current score thumb */}
        <div
          className="absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 overflow-hidden"
          style={{
            left: `${animatedWidth}%`,
            transition: 'left 900ms cubic-bezier(0.16,1,0.3,1)',
            borderColor: '#e9d5ff',
            boxShadow: '0 0 8px 3px rgba(168,85,247,0.8)',
            background: '#c084fc',
          }}
        />
      </div>

      <div className="relative mt-2 h-4">
        {milestoneLabels.map(label => (
          <span
            key={label}
            className="sp-numeric absolute -translate-x-1/2 text-[10px] text-[var(--text-muted)]"
            style={{ left: `${pct(label)}%` }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
