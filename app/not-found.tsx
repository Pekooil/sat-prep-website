import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ResourceHero, ResourceShell } from '@/components/marketing/resource-shell'
import styles from '@/components/marketing/resource-shell.module.css'

export default function NotFound() {
  return (
    <ResourceShell>
      <ResourceHero eyebrow="Page not found" title="That path drifted off course" description="The page may have moved, but your next useful SAT step is still easy to find." />
      <section className={styles.guideGrid} aria-label="Helpful destinations">
        <Link href="/tools/sat-study-plan"><span>Free tool</span><h2>Build an SAT study plan</h2><p>Turn your score, goal, test date, and available time into a starting schedule.</p><strong>Open the planner <ArrowRight /></strong></Link>
        <Link href="/guides"><span>Study resources</span><h2>Browse Digital SAT guides</h2><p>Choose a practical schedule, mistake-review method, or official practice workflow.</p><strong>Browse guides <ArrowRight /></strong></Link>
      </section>
    </ResourceShell>
  )
}
