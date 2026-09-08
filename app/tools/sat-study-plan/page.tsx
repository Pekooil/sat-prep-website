import type { Metadata } from 'next'
import { StudyPlanGenerator } from '@/components/marketing/study-plan-generator'
import { ResourceHero, ResourceShell } from '@/components/marketing/resource-shell'
import { PlannerStructuredData } from '@/components/marketing/structured-data'

export const metadata: Metadata = {
  title: 'Free SAT Study Plan Generator',
  description: 'Build a free personalized Digital SAT study plan around your current score, target score, test date, available time, and weak area.',
  alternates: { canonical: '/tools/sat-study-plan' },
  openGraph: {
    title: 'Free SAT Study Plan Generator — SaturnPath',
    description: 'Preview a personalized Digital SAT schedule in under a minute. No account required.',
    url: '/tools/sat-study-plan',
  },
}

export default function SatStudyPlanPage() {
  return (
    <ResourceShell>
      <PlannerStructuredData />
      <ResourceHero
        eyebrow="Personalized in under a minute"
        title="Free SAT study plan generator"
        description="Turn your score, goal, test date, and available time into a practical starting schedule. Preview it now, then use SaturnPath to make it adapt as you practice."
      />
      <StudyPlanGenerator />
    </ResourceShell>
  )
}
