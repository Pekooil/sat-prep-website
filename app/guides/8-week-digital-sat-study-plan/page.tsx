import type { Metadata } from 'next'
import Link from 'next/link'
import { ArticleStructuredData } from '@/components/marketing/structured-data'
import { ResourceCta, ResourceHero, ResourceShell } from '@/components/marketing/resource-shell'
import styles from '@/components/marketing/resource-shell.module.css'

const title = '8-Week Digital SAT Study Plan'
const description = 'An eight-week Digital SAT schedule for building skills, reviewing mistakes, practicing under time, and preparing calmly for test day.'
const path = '/guides/8-week-digital-sat-study-plan'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { title: `${title} — SaturnPath`, description, url: path },
}

export default function EightWeekPlanPage() {
  return (
    <ResourceShell>
      <ArticleStructuredData title={title} description={description} path={path} />
      <ResourceHero eyebrow="Eight-week schedule" title="Build skills first. Add pressure later." description="This two-month Digital SAT plan separates diagnosis, targeted growth, timed transfer, and test readiness so every week has a clear job." />
      <article className={styles.article}>
        <section>
          <h2>The weekly rhythm</h2>
          <p>Plan four to six short sessions each week, depending on your score gap and available time. Keep at least one rest day. Most sessions should target a narrow skill; one session should mix topics or introduce timing; another should revisit earlier mistakes.</p>
          <ul>
            <li><strong>Two priority sessions:</strong> your weakest section and its highest-cost skills.</li>
            <li><strong>One maintenance session:</strong> the stronger section so it does not quietly slide.</li>
            <li><strong>One mixed or timed session:</strong> practice switching skills and managing the clock.</li>
            <li><strong>One review session:</strong> retry mistakes after some time has passed.</li>
          </ul>
        </section>
        <section>
          <h2>Your eight-week roadmap</h2>
          <div className={styles.schedule}>
            <article><strong>Week 1</strong><p>Take an official baseline and classify misses by skill, cause, and timing. Select no more than four initial priority skills.</p></article>
            <article><strong>Week 2</strong><p>Repair foundations in the weakest skills. Work untimed when learning, then add a short timed check only after the process is reliable.</p></article>
            <article><strong>Week 3</strong><p>Continue targeted practice and retry week-one mistakes. Replace mastered skills instead of repeating comfortable questions indefinitely.</p></article>
            <article><strong>Week 4</strong><p>Complete a midpoint checkpoint under realistic conditions. Compare error patterns—not only scores—with your baseline.</p></article>
            <article><strong>Week 5</strong><p>Use the checkpoint to reprioritize. Add mixed sets that require you to recognize the skill without being told what type of question is coming.</p></article>
            <article><strong>Week 6</strong><p>Practice module pacing and recovery. Decide when to move on, when to flag a question, and how you will check work with remaining time.</p></article>
            <article><strong>Week 7</strong><p>Run your final full-length dress rehearsal early enough to review it properly. Target only the few patterns still repeating.</p></article>
            <article><strong>Week 8</strong><p>Reduce volume, keep short confidence-building sessions, review your error-log lessons, and prepare your device and test-day routine.</p></article>
          </div>
        </section>
        <section>
          <h2>How to adjust the plan</h2>
          <h3>If your score gap is under 100 points</h3>
          <p>Use fewer broad lessons and more careful review of execution: pacing, answer-choice traps, setup accuracy, and the handful of skills still creating repeat misses.</p>
          <h3>If your score gap is larger</h3>
          <p>Protect more untimed learning time in weeks two through five. Do not let constant full tests replace concept work. Tests diagnose; targeted study is where many corrections are built.</p>
          <h3>If you miss a week</h3>
          <p>Do not double every assignment. Keep the final rehearsal and review window, then remove lower-priority repetition from the middle. A plan should respond to your life rather than punish you for it.</p>
        </section>
        <section>
          <h2>Build the version that fits your calendar</h2>
          <p>The right workload depends on your exact test date, score gap, time, and weak section. Generate a tailored outline with SaturnPath’s <Link href="/tools/sat-study-plan">free SAT study planner</Link>, then save it to make future sessions respond to your results.</p>
        </section>
      </article>
      <ResourceCta />
    </ResourceShell>
  )
}
