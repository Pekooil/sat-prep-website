import type { Metadata } from 'next'
import Link from 'next/link'
import { ArticleStructuredData } from '@/components/marketing/structured-data'
import { ResourceCta, ResourceHero, ResourceShell } from '@/components/marketing/resource-shell'
import styles from '@/components/marketing/resource-shell.module.css'

const title = 'How to Make an SAT Error Log That Improves Your Practice'
const description = 'A simple SAT error log method for classifying mistakes, choosing the right correction, and scheduling useful retries without copying question text.'
const path = '/guides/sat-error-log'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { title: `${title} — SaturnPath`, description, url: path },
}

export default function SatErrorLogPage() {
  return (
    <ResourceShell>
      <ArticleStructuredData title={title} description={description} path={path} />
      <ResourceHero eyebrow="Review that changes what comes next" title="Your SAT error log should be short enough to use" description="The goal is not to rewrite every question. Capture the reason for the miss, the correction you can reuse, and when you will test that correction again." />
      <article className={styles.article}>
        <section>
          <h2>The five fields that matter</h2>
          <ol>
            <li><strong>Source and question reference:</strong> enough information to find the problem again. Do not paste copyrighted question text.</li>
            <li><strong>Section and skill:</strong> Math or Reading and Writing, followed by the most specific skill you can identify.</li>
            <li><strong>Mistake type:</strong> concept gap, setup or strategy error, careless execution, timing, or guess.</li>
            <li><strong>Reusable lesson:</strong> one sentence beginning with “Next time, I will…”</li>
            <li><strong>Review date:</strong> a scheduled retry after enough time has passed that you are recalling the method, not the answer.</li>
          </ol>
          <div className={styles.callout}><strong>A good entry</strong><p>“Advanced Math · setup error · I expanded before isolating the repeated expression. Next time I will name the repeated expression first. Retry in three days.”</p></div>
        </section>
        <section>
          <h2>Classify the cause before choosing the fix</h2>
          <div className={styles.schedule}>
            <article><strong>Concept gap</strong><p>You did not know or understand the required idea. Learn it, work a simple example, then try a fresh question.</p></article>
            <article><strong>Setup or strategy</strong><p>You knew the ingredients but chose an unreliable path. Write the decision rule that would have pointed you toward a better setup.</p></article>
            <article><strong>Careless execution</strong><p>Identify the exact trigger—copied sign, unit, constraint, answer selection—not simply “be careful.” Add a specific check.</p></article>
            <article><strong>Timing</strong><p>Record whether the problem was slow recognition, slow execution, or staying too long. Practice the relevant skill and your move-on rule.</p></article>
            <article><strong>Guess</strong><p>Separate an informed elimination from a blind guess. Review the reasoning that would let you eliminate one more option next time.</p></article>
          </div>
        </section>
        <section>
          <h2>A ten-minute review routine</h2>
          <ol>
            <li>Re-solve the question without looking at your previous work.</li>
            <li>Explain why the correct method works in one or two sentences.</li>
            <li>Complete one fresh question testing the same skill.</li>
            <li>If the same cause appears again, keep it in the review queue. If the correction transfers, increase the interval before the next check.</li>
          </ol>
          <p>Reviewing mistakes is most valuable when it affects your schedule. SaturnPath connects error patterns with future sessions, while the <Link href="/tools/sat-study-plan">free planner</Link> gives you a starting weekly rhythm.</p>
        </section>
        <section>
          <h2>What not to put in the log</h2>
          <ul>
            <li>Long copies of the original question or explanation</li>
            <li>“Silly mistake” without identifying the specific behavior</li>
            <li>Every correct question, unless it revealed a fragile or very slow method</li>
            <li>A review date you have no realistic time to keep</li>
          </ul>
        </section>
      </article>
      <ResourceCta title="Let your mistakes reshape the plan." description="SaturnPath connects your error patterns, review queue, calendar, and progress so the lesson from one session changes the next." />
    </ResourceShell>
  )
}
