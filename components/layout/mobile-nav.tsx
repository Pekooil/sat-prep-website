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
      <div className="flex items-center justify-around h-16 px-2">
        {mobileLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-blue-600 dark:text-blue-400')} />
              <span className="text-[10px] font-medium leading-none truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
