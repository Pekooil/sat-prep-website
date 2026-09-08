import type { Metadata } from 'next'
import Link from 'next/link'
import { ArticleStructuredData } from '@/components/marketing/structured-data'
import { ResourceCta, ResourceHero, ResourceShell } from '@/components/marketing/resource-shell'
import styles from '@/components/marketing/resource-shell.module.css'

const title = 'How to Use the College Board SAT Question Bank Effectively'
const description = 'A practical workflow for turning College Board Student Question Bank filters into focused SAT practice, useful review, and a balanced study schedule.'
const path = '/guides/college-board-question-bank'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { title: `${title} — SaturnPath`, description, url: path },
}

export default function QuestionBankGuidePage() {
  return (
    <ResourceShell>
      <ArticleStructuredData title={title} description={description} path={path} />
      <ResourceHero eyebrow="Official questions, focused sessions" title="Use the SAT Question Bank with a purpose" description="Filtering thousands of official questions is easy. Choosing the right set, reviewing it well, and knowing what to do tomorrow is the part that needs a system." />
      <article className={styles.article}>
        <section>
          <h2>Start with a diagnosis, not a favorite topic</h2>
          <p>Use a recent SAT, PSAT, or scored Bluebook practice result to choose your first priority. If you do not have a baseline, take an official checkpoint before building a large question set.</p>
          <p>College Board says its Student Question Bank contains thousands of official questions and can be filtered by section, domain, skill, and difficulty. Use those filters to answer one narrow question—such as “Can I reliably solve medium Advanced Math questions?”—rather than creating a random mixed worksheet.</p>
        </section>
        <section>
          <h2>A five-step question-bank workflow</h2>
          <div className={styles.schedule}>
            <article><strong>1. Choose one skill</strong><p>Pick the highest-priority skill supported by recent evidence. Avoid combining several weak areas in your first corrective set.</p></article>
            <article><strong>2. Match difficulty</strong><p>Begin where you can learn the process. Move up after accurate repetitions instead of using only hard questions as a measure of ambition.</p></article>
            <article><strong>3. Keep the set short</strong><p>A focused set of roughly 8–15 questions leaves time for review. Stop earlier if you uncover a clear concept gap that needs instruction.</p></article>
            <article><strong>4. Record the cause</strong><p>For each miss, note the skill, mistake type, reusable lesson, and a reference that lets you find the question again. Use this <Link href="/guides/sat-error-log">error-log method</Link>.</p></article>
            <article><strong>5. Schedule a fresh check</strong><p>Return to the skill with new questions after a delay. A correct immediate retry may reflect memory; a later transfer is stronger evidence.</p></article>
          </div>
        </section>
        <section>
          <h2>Balance targeted sets with full-length practice</h2>
          <p>Question-bank work isolates skills; it does not recreate the full adaptive experience or the sustained pacing of test day. College Board recommends using Bluebook full-length practice and notes that those tests use the same multistage adaptive model as the SAT.</p>
          <ul>
            <li>Use the question bank during the week for targeted learning and review.</li>
            <li>Use Bluebook periodically to diagnose transfer, timing, and endurance.</li>
            <li>Let the newest evidence change next week’s skill priorities.</li>
          </ul>
        </section>
        <section>
          <h2>Official resources</h2>
          <p>Open the <a href="https://satsuite.collegeboard.org/practice/student-question-bank" rel="noopener noreferrer">College Board Student Question Bank guide</a> for current access and filter details. Use <a href="https://satsuite.collegeboard.org/practice/bluebook" rel="noopener noreferrer">Bluebook practice guidance</a> for full-length testing and test-interface preparation.</p>
          <p>SaturnPath does not access the Question Bank for you or reproduce its copyrighted questions. It helps organize the plan, sessions, mistakes, and next actions around your practice.</p>
        </section>
      </article>
      <ResourceCta title="Know what to practice next." description="Build a starting calendar from your score, test date, time, and weak area, then use your results to keep the plan focused." />
    </ResourceShell>
  )
}
