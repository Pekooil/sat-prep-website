import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ResourceHero, ResourceShell } from '@/components/marketing/resource-shell'
import styles from '@/components/marketing/resource-shell.module.css'

export const metadata: Metadata = {
  title: 'Free Digital SAT Study Guides',
  description: 'Practical Digital SAT study schedules, mistake-review methods, and official Question Bank workflows from SaturnPath.',
  alternates: { canonical: '/guides' },
  openGraph: {
    title: 'Free Digital SAT Study Guides — SaturnPath',
    description: 'Practical SAT plans and review systems designed to give every practice session a clear purpose.',
    url: '/guides',
  },
}

const guides = [
  { href: '/guides/30-day-digital-sat-study-plan', label: '30-day schedule', title: '30-Day Digital SAT Study Plan', description: 'Four focused weeks of diagnosis, targeted practice, timed transfer, and final preparation.' },
  { href: '/guides/8-week-digital-sat-study-plan', label: '8-week schedule', title: '8-Week Digital SAT Study Plan', description: 'A two-month roadmap that builds skills first and introduces pressure at the right time.' },
  { href: '/guides/sat-error-log', label: 'Mistake review', title: 'How to Build an SAT Error Log', description: 'A short, reusable system for turning each mistake into a specific correction and future check.' },
  { href: '/guides/college-board-question-bank', label: 'Official practice', title: 'How to Use the SAT Question Bank', description: 'A focused workflow for choosing question sets, reviewing them, and deciding what to practice next.' },
]

export default function GuidesPage() {
  return (
    <ResourceShell>
      <ResourceHero eyebrow="Free Digital SAT guides" title="A useful next step—not more noise" description="Choose the schedule or review system that matches your problem today, then turn it into a personalized plan when you are ready." />
      <section className={styles.guideGrid} aria-label="SAT study guides">
        {guides.map((guide) => (
          <Link href={guide.href} key={guide.href}>
            <span>{guide.label}</span>
            <h2>{guide.title}</h2>
            <p>{guide.description}</p>
            <strong>Read the guide <ArrowRight /></strong>
          </Link>
        ))}
      </section>
    </ResourceShell>
  )
}
