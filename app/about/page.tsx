import type { Metadata } from 'next'
import Link from 'next/link'
import { BreadcrumbStructuredData } from '@/components/marketing/structured-data'
import { ResourceCta, ResourceHero, ResourceShell } from '@/components/marketing/resource-shell'
import styles from '@/components/marketing/resource-shell.module.css'
import { createSocialMetadata } from '@/lib/marketing/metadata'

const title = 'How SaturnPath Works'
const description = 'How SaturnPath approaches personalized SAT planning, adaptive practice, mistake review, student privacy, and free access.'
const path = '/about'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  ...createSocialMetadata({ title: `${title} — Free Adaptive SAT Prep`, description, path }),
}

export default function AboutPage() {
  return (
    <ResourceShell>
      <BreadcrumbStructuredData items={[{ name: 'Home', path: '/' }, { name: 'About SaturnPath', path }]} />
      <ResourceHero
        eyebrow="How SaturnPath works"
        title="Focused SAT prep, with the reasoning made visible"
        description="SaturnPath is a free planning and practice tool designed to turn a student's goals, time, and learning signals into a clear next step."
        meta="Product methodology · Updated September 9, 2026"
      />
      <article className={styles.article}>
        <section>
          <h2>The problem we are trying to solve</h2>
          <p>Many students have plenty of questions but no reliable way to decide which questions matter today. A static calendar can also become unrealistic as soon as school, work, or an unexpected weak area changes the plan.</p>
          <p>SaturnPath starts with the student’s current score, target, test date, available time, and weak areas. Practice results, timing, confidence, and mistake patterns then help determine what should come next.</p>
        </section>
        <section>
          <h2>How recommendations are made</h2>
          <div className={styles.schedule}>
            <article><strong>Start with context</strong><p>A plan should fit the test date and the amount of time a student can actually protect each week.</p></article>
            <article><strong>Use recent evidence</strong><p>Accuracy, pace, confidence, skill, and mistake type are more useful together than a single score in isolation.</p></article>
            <article><strong>Keep sessions focused</strong><p>Short sessions reduce setup and make the purpose of each question easier to understand.</p></article>
            <article><strong>Review for transfer</strong><p>A correction matters when it works on a fresh problem later, not only when the original explanation is still familiar.</p></article>
          </div>
        </section>
        <section>
          <h2>What SaturnPath does not claim</h2>
          <ul>
            <li>Score estimates and plans are guidance, not guarantees of a particular SAT result.</li>
            <li>SaturnPath is independent and is not affiliated with or endorsed by College Board.</li>
            <li>SaturnPath does not reproduce College Board questions or replace official Bluebook practice.</li>
            <li>Recommendations are study support, not professional educational, psychological, or medical advice.</li>
          </ul>
        </section>
        <section>
          <h2>Official practice and student privacy</h2>
          <p>We encourage students to use current official materials for baseline and full-length practice. Our guides link directly to College Board’s <a href="https://satsuite.collegeboard.org/practice/bluebook" rel="noopener noreferrer">Bluebook practice guidance</a> and <a href="https://satsuite.collegeboard.org/practice/student-question-bank" rel="noopener noreferrer">Student Question Bank</a>.</p>
          <p>We do not sell personal information or use student data for targeted advertising. The public study-plan preview does not require an account. Read the complete <Link href="/privacy">privacy policy</Link> for the data used after account creation.</p>
        </section>
        <section>
          <h2>Why it is free</h2>
          <p>SaturnPath is built on the belief that a useful study plan and clear feedback should not depend on a subscription. The core web product is free, with no credit card or premium study tier required.</p>
        </section>
      </article>
      <ResourceCta title="Build a plan before creating an account." description="Preview a practical SAT schedule from your score, goal, test date, time, and weak area. Nothing is saved to a student profile until you choose to sign up." />
    </ResourceShell>
  )
}
