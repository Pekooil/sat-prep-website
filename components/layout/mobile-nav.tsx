'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, AlertCircle, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

// Inventory (/inventory) is an admin surface — reached from the sidebar/topbar,
// not the bottom bar — so the 5 student-facing tabs each get a roomier hit area.
const mobileLinks = [
  { href: '/home',      label: 'Home',     icon: Home },
  { href: '/calendar',  label: 'Calendar', icon: Calendar },
  { href: '/error-log', label: 'Errors',   icon: AlertCircle },
  { href: '/data',      label: 'Data',     icon: BarChart2 },
  { href: '/settings',  label: 'Settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface-raised)]/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-16 px-1">
        {mobileLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className="flex min-w-0 flex-1 flex-col items-center gap-0.5"
            >
              <span className={cn(
                'flex flex-col items-center gap-0.5 rounded-[var(--radius-sm)] px-3 py-1.5 transition-colors duration-[var(--dur-fast)]',
                isActive ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-sunken)]',
              )}>
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors duration-[var(--dur-fast)]',
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                  )}
                  strokeWidth={1.75}
                />
                <span className={cn(
                  'truncate text-[10px] font-medium leading-none transition-colors duration-[var(--dur-fast)]',
                  isActive ? 'text-[var(--accent-soft-foreground)]' : 'text-[var(--text-muted)]',
                )}>
                  {label}
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
