'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, LogOut, User, Settings } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { NotificationsDropdown } from './notifications-dropdown'
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
        <Link href="/home" className="flex items-center gap-2 font-bold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="hidden sm:block text-[var(--foreground)]">SAT Planner AI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname === link.href || pathname.startsWith(link.href + '/')
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <NotificationsDropdown userId={user?.id} />
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
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
