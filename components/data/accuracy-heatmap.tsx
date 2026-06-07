'use client'

import { Map } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DOMAIN_CATALOG } from '@/lib/study-plan-engine/domain-catalog'
import type { QuestionSession } from '@/types'

interface AccuracyHeatmapProps {
  sessions: QuestionSession[]
}

// DomainGrid must live at module level (not inside AccuracyHeatmap) to satisfy
// the react-hooks/no-unstable-components rule.
function DomainGrid({
  domains,
  acc,
  skillAcc,
}: {
  domains: typeof DOMAIN_CATALOG
  acc: (label: string) => number | null
  skillAcc: (label: string) => number | null
}) {
  return (
    <div className="space-y-3">
      {domains.map(domain => {
        const domAcc = acc(domain.label)
        return (
          <div key={domain.key}>
            <div className="flex items-center gap-2 mb-1">
              <div
                title={domAcc !== null ? `${domAcc}%` : 'No data'}
                className={cn('h-5 w-5 rounded shrink-0', cellBg(domAcc))}
              />
              <span className="text-xs font-medium text-[var(--foreground)] truncate">
                {domain.label}
              </span>
              {domAcc !== null && (
                <span className="ml-auto text-xs font-bold tabular-nums shrink-0">
                  {domAcc}%
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 pl-7">
              {domain.skills.map(skill => {
                const sAcc = skillAcc(skill.label)
                return (
                  <span
                    key={skill.label}
                    title={sAcc !== null ? `${skill.label} · ${sAcc}%` : `${skill.label} · No data`}
                    className={cn(
                      'inline-block rounded px-2 py-0.5 text-[10px] font-medium truncate max-w-[180px]',
                      sAcc !== null
                        ? `${cellBg(sAcc)} text-white`
                        : 'bg-slate-100 dark:bg-slate-800 text-[var(--muted-foreground)]',
                    )}
                  >
                    {skill.label}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function cellBg(acc: number | null): string {
  if (acc === null) return 'bg-slate-100 dark:bg-slate-800/50'
  if (acc >= 90)   return 'bg-emerald-500 dark:bg-emerald-600'
  if (acc >= 75)   return 'bg-emerald-400 dark:bg-emerald-700'
  if (acc >= 60)   return 'bg-amber-400 dark:bg-amber-500'
  if (acc >= 40)   return 'bg-orange-400 dark:bg-orange-500'
  return 'bg-red-500 dark:bg-red-600'
}

export function AccuracyHeatmap({ sessions }: AccuracyHeatmapProps) {
  // Aggregate per category (domain label) and per subcategory (skill label)
  type Acc = { a: number; c: number }
  const byDomain: Record<string, Acc> = {}
  const bySkill:  Record<string, Acc> = {}

  for (const s of sessions) {
    if (!s.category) continue
    byDomain[s.category] ??= { a: 0, c: 0 }
    byDomain[s.category].a += s.questions_attempted ?? 0
    byDomain[s.category].c += s.questions_correct   ?? 0

    if (s.subcategory) {
      bySkill[s.subcategory] ??= { a: 0, c: 0 }
      bySkill[s.subcategory].a += s.questions_attempted ?? 0
      bySkill[s.subcategory].c += s.questions_correct   ?? 0
    }
  }

  const mathDomains = DOMAIN_CATALOG.filter(d => d.subject === 'math')
  const rwDomains   = DOMAIN_CATALOG.filter(d => d.subject === 'reading_writing')

  const acc = (label: string): number | null => {
    const d = byDomain[label]
    return d && d.a > 0 ? Math.round((d.c / d.a) * 100) : null
  }

  const skillAcc = (label: string): number | null => {
    const d = bySkill[label]
    return d && d.a > 0 ? Math.round((d.c / d.a) * 100) : null
  }

  const hasAnyData = Object.values(byDomain).some(d => d.a > 0)

  if (!hasAnyData) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Accuracy by Topic</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
            <Map className="h-5 w-5 text-[var(--muted-foreground)]" />
          </div>
          <p className="font-medium text-sm">No session data</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 text-center">
            Practice sessions will populate this heatmap.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Accuracy by Topic</CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">
          Domain &amp; skill accuracy — all-time aggregate
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">Math</p>
            <DomainGrid domains={mathDomains} acc={acc} skillAcc={skillAcc} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">Reading &amp; Writing</p>
            <DomainGrid domains={rwDomains} acc={acc} skillAcc={skillAcc} />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-4 text-[10px] text-[var(--muted-foreground)] flex-wrap">
          {[
            { bg: 'bg-slate-100 dark:bg-slate-800/50', label: 'No data' },
            { bg: 'bg-red-500', label: '<40%' },
            { bg: 'bg-orange-400', label: '40–59%' },
            { bg: 'bg-amber-400', label: '60–74%' },
            { bg: 'bg-emerald-400', label: '75–89%' },
            { bg: 'bg-emerald-500', label: '≥90%' },
          ].map(({ bg, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span className={cn('h-3 w-3 rounded', bg)} />
              {label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
