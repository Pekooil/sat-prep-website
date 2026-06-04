'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { parseISO, subDays, isAfter } from 'date-fns'
import { DOMAIN_CATALOG } from '@/lib/study-plan-engine/domain-catalog'
import { cn } from '@/lib/utils'
import type { QuestionSession } from '@/types'

interface TopicRankingsProps {
  sessions: QuestionSession[]
}

interface DomainStat {
  label:         string
  subject:       'math' | 'reading_writing'
  accuracy:      number
  attempted:     number
  recentAcc:     number | null   // last 14 days
  trend:         'up' | 'down' | 'flat' | 'new'
}

function computeStats(sessions: QuestionSession[]): DomainStat[] {
  const recent14 = subDays(new Date(), 14)

  type Acc = { a: number; c: number }
  const all:    Record<string, Acc> = {}
  const recent: Record<string, Acc> = {}

  for (const s of sessions) {
    if (!s.category || !s.session_date) continue
    all[s.category]    ??= { a: 0, c: 0 }
    all[s.category].a  += s.questions_attempted ?? 0
    all[s.category].c  += s.questions_correct   ?? 0

    if (isAfter(parseISO(s.session_date), recent14)) {
      recent[s.category]   ??= { a: 0, c: 0 }
      recent[s.category].a += s.questions_attempted ?? 0
      recent[s.category].c += s.questions_correct   ?? 0
    }
  }

  return DOMAIN_CATALOG
    .filter(d => all[d.label] && all[d.label].a > 0)
    .map(d => {
      const a       = all[d.label]
      const r       = recent[d.label]
      const acc     = Math.round((a.c / a.a) * 100)
      const recAcc  = r && r.a > 0 ? Math.round((r.c / r.a) * 100) : null

      let trend: DomainStat['trend'] = 'flat'
      if (recAcc === null)              trend = 'new'
      else if (recAcc - acc >  5)       trend = 'up'
      else if (recAcc - acc < -5)       trend = 'down'

      return {
        label:     d.label,
        subject:   d.subject,
        accuracy:  acc,
        attempted: a.a,
        recentAcc: recAcc,
        trend,
      }
    })
    .sort((a, b) => a.accuracy - b.accuracy)
}

function TrendIcon({ trend }: { trend: DomainStat['trend'] }) {
  if (trend === 'up')   return <TrendingUp   className="h-3.5 w-3.5 text-emerald-500" />
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
  return                       <Minus        className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
}

function AccBar({ pct }: { pct: number }) {
  const color =
    pct >= 90 ? 'bg-emerald-500' :
    pct >= 75 ? 'bg-emerald-400' :
    pct >= 60 ? 'bg-amber-400'   :
    pct >= 40 ? 'bg-orange-400'  :
               'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-9 text-right">{pct}%</span>
    </div>
  )
}

function Table({
  title, emoji, items, variant,
}: {
  title: string; emoji: string; items: DomainStat[]
  variant: 'weak' | 'strong'
}) {
  if (items.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span>{emoji}</span> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center py-10">
          <p className="text-sm text-[var(--muted-foreground)]">No data yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span>{emoji}</span>
          <span>{title}</span>
        </CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">
          {variant === 'weak' ? 'Focus here to gain the most points' : 'Your strongest domains'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Badge
                    variant={item.subject === 'math' ? 'math' : 'reading'}
                    className="text-[9px] py-0 px-1.5 shrink-0"
                  >
                    {item.subject === 'math' ? 'M' : 'RW'}
                  </Badge>
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <TrendIcon trend={item.trend} />
                  <span className="text-[10px] text-[var(--muted-foreground)]">{item.attempted}q</span>
                </div>
              </div>
              <AccBar pct={item.accuracy} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function TopicRankings({ sessions }: TopicRankingsProps) {
  const stats   = computeStats(sessions)
  const weakest = stats.slice(0, 4)
  const strongest = [...stats].reverse().slice(0, 4)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Table title="Weakest Topics" emoji="🔴" items={weakest}  variant="weak" />
      <Table title="Strongest Topics" emoji="🟢" items={strongest} variant="strong" />
    </div>
  )
}
