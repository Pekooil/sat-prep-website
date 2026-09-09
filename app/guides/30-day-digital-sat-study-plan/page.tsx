import type { Metadata } from 'next'
import Link from 'next/link'
import { ArticleStructuredData, BreadcrumbStructuredData } from '@/components/marketing/structured-data'
import { ResourceCta, ResourceHero, ResourceShell } from '@/components/marketing/resource-shell'
import styles from '@/components/marketing/resource-shell.module.css'
import { createSocialMetadata } from '@/lib/marketing/metadata'

const title = '30-Day Digital SAT Study Plan'
const description = 'A practical four-week Digital SAT study schedule built around official practice, targeted skill work, mistake review, and realistic timing.'
const path = '/guides/30-day-digital-sat-study-plan'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  ...createSocialMetadata({ title: `${title} — SaturnPath`, description, path, type: 'article' }),
}

export default function ThirtyDayPlanPage() {
  return (
    <ResourceShell>
      <ArticleStructuredData title={title} description={description} path={path} />
      <BreadcrumbStructuredData items={[{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }, { name: title, path }]} />
      <ResourceHero eyebrow="Four focused weeks" title="A 30-day Digital SAT study plan you can actually follow" description="Use official practice to find the skills that matter, spend most days on targeted work, and reserve enough time to review instead of simply counting questions." meta="By SaturnPath · Updated September 9, 2026 · Reviewed against current official practice guidance" />
      <article className={styles.article}>
        <section>
          <h2>Before day one</h2>
          <p>Choose a test date, write down your current Math and Reading and Writing scores, and decide how many minutes you can protect on most study days. A repeatable 30-minute session is more useful than a two-hour plan you regularly skip.</p>
          <p>Use a scored, full-length Bluebook practice test as your baseline when possible. College Board explains that Bluebook practice uses the SAT’s multistage adaptive model and recommends using realistic testing conditions. Afterward, record the skills behind your misses rather than treating the total score as the whole diagnosis.</p>
          <div className={styles.callout}><strong>Your rule for the month</strong><p>Every missed question must produce a next action: learn a concept, repair a process, improve pacing, or reduce a careless-error trigger.</p></div>
        </section>
        <section>
          <h2>The four-week schedule</h2>
          <div className={styles.schedule}>
            <article><strong>Days 1–3</strong><p>Take or review an official baseline. Identify the two weakest skills in each section and begin an <Link href="/guides/sat-error-log">SAT error log</Link>.</p></article>
            <article><strong>Days 4–9</strong><p>Spend three sessions on your weakest section, two on your second priority, and one on a short timed mixed set. Review every miss the same day.</p></article>
            <article><strong>Day 10</strong><p>Run a checkpoint. Do not chase a predicted score; check whether the specific error patterns from week one are becoming less frequent.</p></article>
            <article><strong>Days 11–17</strong><p>Keep the same weekly rhythm, but retire skills that are consistently accurate. Replace them with the next weakest skill or a timing problem.</p></article>
            <article><strong>Day 18</strong><p>Complete a longer timed set or a full Bluebook test under quiet, test-like conditions. Practice using the tools and pacing strategy you intend to use.</p></article>
            <article><strong>Days 19–25</strong><p>Review the test deeply. Re-solve misses without the explanation, then use targeted questions to confirm that the correction transfers to new problems.</p></article>
            <article><strong>Days 26–27</strong><p>Complete your final demanding practice. Focus on execution, transitions between modules, and avoiding preventable misses.</p></article>
            <article><strong>Days 28–30</strong><p>Taper. Review a short list of recurring lessons, prepare your testing setup, and protect sleep. Avoid cramming an unfamiliar topic the night before.</p></article>
          </div>
        </section>
        <section>
          <h2>What to do in a 30-minute session</h2>
          <ol>
            <li>Spend 3 minutes recalling the last lesson from your error log.</li>
            <li>Complete 18–20 minutes of questions focused on one skill or one timing objective.</li>
            <li>Use the final 7–9 minutes to review why each miss happened and schedule a retry.</li>
          </ol>
          <p>If your test date or available time is different, use the <Link href="/tools/sat-study-plan">free SAT study plan generator</Link> to create a more realistic starting rhythm.</p>
        </section>
        <section>
          <h2>Use official material deliberately</h2>
          <p>College Board’s <a href="https://satsuite.collegeboard.org/practice/bluebook" rel="noopener noreferrer">Bluebook practice guidance</a> recommends paying attention to pacing, testing strategies, and realistic conditions—not just the final score. For targeted follow-up, the <a href="https://satsuite.collegeboard.org/practice/student-question-bank" rel="noopener noreferrer">Student Question Bank</a> can be filtered by section, domain, skill, and difficulty.</p>
        </section>
      </article>
      <ResourceCta />
    </ResourceShell>
  )
}
