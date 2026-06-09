'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Calendar, ClipboardList, BarChart3, Package, GraduationCap,
  Settings, LogOut, type LucideIcon,
} from 'lucide-react'
import { SaturnPathLogo } from './saturn-path-logo'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { NAV_LINKS } from '@/lib/constants'
import { signOut } from '@/actions/auth'
import type { User as UserType } from '@/types'

const NAV_ICONS: Record<string, LucideIcon> = {
  '/home':      Home,
  '/calendar':  Calendar,
  '/error-log': ClipboardList,
  '/data':      BarChart3,
  '/inventory': Package,
  '/tutorial':  GraduationCap,
}

interface SidebarProps {
  user: UserType | null
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className="hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-[var(--border)] bg-[var(--surface-raised)]"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Brand */}
      <div className="flex h-[var(--topbar-height)] items-center px-5">
        <SaturnPathLogo size="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_LINKS.map((link) => {
            const Icon = NAV_ICONS[link.href] ?? Home
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium',
                    'transition-colors duration-[var(--dur-fast)]',
                    'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--ring)]',
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]'
                      : 'text-[var(--text-body)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-heading)]'
                  )}
                >
                  {/* Active rail */}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)] transition-opacity duration-[var(--dur-fast)]',
                      isActive ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <Icon
                    className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-heading)]')}
                    strokeWidth={1.75}
                  />
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User menu */}
      <div className="border-t border-[var(--border)] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] p-2 text-left transition-colors hover:bg-[var(--surface-sunken)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--ring)] cursor-pointer">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: 'var(--gradient-avatar)' }}
              >
                {user?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-heading)]">{user?.full_name ?? 'Student'}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-[calc(var(--sidebar-width)-1.5rem)]">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-[var(--text-heading)]">{user?.full_name ?? 'Student'}</p>
              <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-700 dark:text-red-400"
              onClick={async () => { await signOut() }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
