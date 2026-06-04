import type { Metadata } from 'next'
import { AboutSection } from '@/components/info/about-section'

export const metadata: Metadata = {
  title: 'Info & Contact',
  description: 'Learn how SAT Study Planner AI works, read FAQs, and get in touch.',
}
import { FAQAccordion } from '@/components/info/faq-accordion'
import { ContactForm } from '@/components/info/contact-form'

export default function InfoPage() {
  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Info & Contact</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Learn how SAT Study Planner AI works and get in touch.
        </p>
      </div>

      <AboutSection />
      <FAQAccordion />
      <ContactForm />
    </div>
  )
}
