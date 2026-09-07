'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, BookOpenCheck, CircleUserRound, Home, LogOut, RotateCcw, Sparkles } from 'lucide-react'
import { signOut } from '@/actions/auth'

const navItems = [
  { href: '/home', label: 'Today', icon: Home },
  { href: '/data', label: 'Progress', icon: BarChart3 },
  { href: '/error-log', label: 'Review', icon: RotateCcw },
  { href: '/settings', label: 'Profile', icon: CircleUserRound },
]

export function V2Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div data-product-version="v2" className="min-h-screen bg-[#f7f7f8] text-zinc-950 dark:bg-[#101012] dark:text-zinc-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-200/80 bg-white/90 px-5 py-6 backdrop-blur md:flex dark:border-zinc-800 dark:bg-zinc-950/90">
        <Link href="/home" className="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-600 text-white shadow-sm"><Sparkles className="h-4 w-4" /></span>SaturnPath</Link>
        <p className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Workspace</p>
        <nav className="mt-3 space-y-1" aria-label="Primary navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href === '/home' && pathname === '/')
            return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'}`}><Icon className="h-4 w-4" />{label}{label === 'Review' && <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-700 dark:bg-violet-950 dark:text-violet-300">live</span>}</Link>
          })}
        </nav>
        <div className="mt-auto border-t border-zinc-200 pt-4 dark:border-zinc-800"><form action={signOut}><button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"><LogOut className="h-4 w-4" />Sign out</button></form></div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-zinc-200/80 bg-[#f7f7f8]/90 px-4 backdrop-blur sm:px-8 dark:border-zinc-800 dark:bg-[#101012]/90"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">SaturnPath workspace</p><p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Your next best step</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300"><BookOpenCheck className="h-3.5 w-3.5" />V2 product</span></header>
        <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-8 sm:py-10">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-zinc-200 bg-white/95 p-2 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95" aria-label="Mobile navigation">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium ${pathname === href ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-500'}`}><Icon className="h-4 w-4" />{label}</Link>)}</nav>
    </div>
  )
}
