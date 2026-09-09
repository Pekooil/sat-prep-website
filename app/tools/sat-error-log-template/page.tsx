import type { Metadata } from 'next'
import { ErrorLogTemplate } from '@/components/marketing/error-log-template'
import { BreadcrumbStructuredData, WebToolStructuredData } from '@/components/marketing/structured-data'
import { ResourceHero, ResourceShell } from '@/components/marketing/resource-shell'
import { createSocialMetadata } from '@/lib/marketing/metadata'

const title = 'Free Printable SAT Error Log Template'
const description = 'Use a free editable SAT error log template to record the skill, mistake cause, reusable lesson, and review date for every useful correction.'
const path = '/tools/sat-error-log-template'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  ...createSocialMetadata({ title: `${title} — SaturnPath`, description, path }),
}

export default function SatErrorLogTemplatePage() {
  return (
    <ResourceShell>
      <WebToolStructuredData name="SaturnPath SAT Error Log Template" description={description} path={path} />
      <BreadcrumbStructuredData items={[{ name: 'Home', path: '/' }, { name: title, path }]} />
      <ResourceHero
        eyebrow="Editable and printable"
        title="A free SAT error log template you will actually use"
        description="Capture the cause, the lesson, and the next review—not paragraphs of copied question text. Fill it in here, then print or save it as a PDF."
      />
      <ErrorLogTemplate />
    </ResourceShell>
  )
}
