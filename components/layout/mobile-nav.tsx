'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, AlertCircle, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-16 px-1">
        {mobileLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 min-w-0 flex-1',
                'transition-all duration-150',
              )}
            >
              <span className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150',
                isActive
                  ? 'bg-violet-100 dark:bg-violet-900/40'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
              )}>
                <Icon className={cn(
                  'h-5 w-5 transition-colors duration-150',
                  isActive ? 'text-violet-600 dark:text-violet-400' : 'text-[var(--muted-foreground)]',
                )} />
                <span className={cn(
                  'text-[10px] font-medium leading-none truncate transition-colors duration-150',
                  isActive ? 'text-violet-600 dark:text-violet-400' : 'text-[var(--muted-foreground)]',
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
