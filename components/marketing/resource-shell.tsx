import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import styles from './resource-shell.module.css'

interface ResourceShellProps {
  children: React.ReactNode
}

interface ResourceHeroProps {
  eyebrow: string
  title: string
  description: string
}

export function ResourceHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="SaturnPath home">
        <span className={styles.brandMark} aria-hidden="true"><span /></span>
        <span>SaturnPath</span>
      </Link>
      <nav aria-label="Resource navigation">
        <Link href="/tools/sat-study-plan">Free planner</Link>
        <Link href="/guides">Study guides</Link>
        <Link href="/login">Log in</Link>
        <Link href="/signup" className={styles.headerCta}>Start free <ArrowRight /></Link>
      </nav>
    </header>
  )
}

export function ResourceHero({ eyebrow, title, description }: ResourceHeroProps) {
  return (
    <header className={styles.hero}>
      <span className={styles.eyebrow}><Sparkles /> {eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  )
}

export function ResourceCta({
  title = 'Turn this guide into your plan.',
  description = 'SaturnPath builds a free study calendar around your score, test date, available time, and weak areas.',
  href = '/tools/sat-study-plan',
  label = 'Build my free SAT plan',
}: {
  title?: string
  description?: string
  href?: string
  label?: string
}) {
  return (
    <aside className={styles.cta}>
      <div><span>Free adaptive SAT prep</span><h2>{title}</h2><p>{description}</p></div>
      <Link href={href}>{label} <ArrowRight /></Link>
    </aside>
  )
}

export function ResourceShell({ children }: ResourceShellProps) {
  return (
    <main id="main-content" className={styles.page}>
      <ResourceHeader />
      {children}
      <footer className={styles.footer}>
        <div><strong>SaturnPath</strong><p>Free, adaptive SAT preparation built around your next best step.</p></div>
        <nav aria-label="Footer navigation">
          <Link href="/tools/sat-study-plan">Free planner</Link>
          <Link href="/guides">Study guides</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <small>SAT® is a registered trademark of College Board. SaturnPath is independent and is not affiliated with or endorsed by College Board.</small>
      </footer>
    </main>
  )
}
