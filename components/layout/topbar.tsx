'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ChevronRight } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { NotificationsDropdown } from './notifications-dropdown'
import { SaturnPathLogo } from './saturn-path-logo'
import { NAV_LINKS } from '@/lib/constants'
import type { User as UserType } from '@/types'

const ROUTE_LABELS: Record<string, string> = {
  ...Object.fromEntries(NAV_LINKS.map((l) => [l.href, l.label])),
  '/settings': 'Settings',
}

interface TopbarProps {
  user: UserType | null
}

export function Topbar({ user }: TopbarProps) {
  const pathname = usePathname()
  const segment = '/' + (pathname.split('/').filter(Boolean)[0] ?? 'home')
  const current = ROUTE_LABELS[segment] ?? 'Home'

  return (
    <header
      className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)]/85 px-4 backdrop-blur-md sm:px-6"
    >
      {/* Left: breadcrumb (desktop) / logo (mobile) */}
      <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-sm min-w-0">
        <Link
          href="/home"
          className="flex items-center gap-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-heading)]"
        >
          <Home className="h-4 w-4" strokeWidth={1.75} />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" strokeWidth={2} />
        <span className="truncate font-medium text-[var(--text-heading)]">{current}</span>
      </nav>
      <div className="md:hidden">
        <SaturnPathLogo size="sm" />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <NotificationsDropdown userId={user?.id} />
        <ThemeToggle />
      </div>
    </header>
  )
}
