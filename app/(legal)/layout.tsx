import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SaturnPathLogo } from '@/components/layout/saturn-path-logo'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <SaturnPathLogo size="sm" />
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-heading)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <article className="legal-prose space-y-5 text-[var(--text-body)]">
          {children}
        </article>

        <footer className="mt-12 flex gap-4 border-t border-[var(--border)] pt-6 text-sm text-[var(--text-muted)]">
          <Link href="/privacy" className="hover:text-[var(--text-heading)] hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[var(--text-heading)] hover:underline">Terms of Service</Link>
        </footer>
      </main>
    </div>
  )
}
