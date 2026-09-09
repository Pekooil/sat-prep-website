import type { Metadata } from 'next'
import { StudyPlanGenerator } from '@/components/marketing/study-plan-generator'
import { ResourceHero, ResourceShell } from '@/components/marketing/resource-shell'
import { BreadcrumbStructuredData, FaqStructuredData, PlannerStructuredData } from '@/components/marketing/structured-data'
import { PLANNER_FAQS } from '@/lib/marketing/seo-content'
import styles from '@/components/marketing/resource-shell.module.css'
import { createSocialMetadata } from '@/lib/marketing/metadata'

const title = 'Free SAT Study Plan Generator'
const description = 'Build a free personalized Digital SAT study plan around your current score, target score, test date, available time, and weak area.'
const path = '/tools/sat-study-plan'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  ...createSocialMetadata({ title: `${title} — SaturnPath`, description: 'Preview a personalized Digital SAT schedule in under a minute. No account required.', path }),
}

export default function SatStudyPlanPage() {
  return (
    <ResourceShell>
      <PlannerStructuredData />
      <BreadcrumbStructuredData items={[{ name: 'Home', path: '/' }, { name: 'Free SAT Study Plan Generator', path: '/tools/sat-study-plan' }]} />
      <FaqStructuredData items={PLANNER_FAQS} />
      <ResourceHero
        eyebrow="Personalized in under a minute"
        title="Free SAT study plan generator"
        description="Turn your score, goal, test date, and available time into a practical starting schedule. Preview it now, then use SaturnPath to make it adapt as you practice."
      />
      <StudyPlanGenerator />
      <section className={styles.faqSection} aria-labelledby="planner-faq-title">
        <span className={styles.eyebrow}>Planner questions</span>
        <h2 id="planner-faq-title">Before you build your plan</h2>
        <div className={styles.faqList}>
          {PLANNER_FAQS.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
        </div>
      </section>
    </ResourceShell>
  )
}
