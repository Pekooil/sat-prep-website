'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { NotificationsDropdown } from './notifications-dropdown'
import { SaturnPathLogo } from './saturn-path-logo'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NAV_LINKS } from '@/lib/constants'
import { signOut } from '@/actions/auth'
import type { User as UserType } from '@/types'

interface NavbarProps {
  user: UserType | null
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <SaturnPathLogo size="sm" />

        {/* Desktop nav — pill */}
        <nav className="hidden md:flex items-center gap-0.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 px-2 py-1.5 shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-700/60 backdrop-blur-sm">
          {NAV_LINKS.map(link => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-600/80'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <NotificationsDropdown userId={user?.id} />
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-semibold" style={{ background: 'var(--gradient-avatar)' }}>
                  {user?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'S'}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.full_name ?? 'Student'}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 dark:text-red-400 cursor-pointer focus:text-red-700"
                onClick={async () => { await signOut() }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
