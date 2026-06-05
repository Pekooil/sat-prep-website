'use client'

import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'Does this platform include actual SAT questions?',
    a: 'No. SaturnPath does not display, store, or distribute any SAT questions. All practice questions must be accessed directly from the College Board\'s official Question Bank at satsuite.collegeboard.org. We only recommend which filters to apply.',
  },
  {
    q: 'How does the AI study plan work?',
    a: 'You provide your current score, target score, test date, and weak areas. Our AI generates a personalized week-by-week schedule with specific College Board Question Bank filter recommendations (domain, skill, difficulty). The AI never generates questions itself.',
  },
  {
    q: 'What data does this platform store?',
    a: 'We store only your account data, study plans, calendar tasks, question session logs (not questions, just counts), error logs you write yourself, and score history. No College Board content is stored.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your data is only visible to you and is protected using Supabase Row Level Security. No other users can access your study data.',
  },
  {
    q: 'How do I track my practice sessions?',
    a: 'After completing practice on the College Board website, come back to add a Question Session: enter which domain/skill you practiced, how many questions you attempted, and how many you got right. You can then log any errors to your Error Log.',
  },
  {
    q: 'What is the Error Log for?',
    a: 'The Error Log is your personal record of mistakes. After reviewing wrong answers on College Board, you log the error type (concept gap, careless mistake, etc.), the domain, and notes about the correct approach. You can then mark errors as "mastered" once you understand them.',
  },
  {
    q: 'Can I use this for both Math and Reading & Writing?',
    a: 'Yes! The platform fully supports both SAT sections with domain breakdowns aligned to the College Board\'s official Digital SAT skill categories.',
  },
]

export function FAQAccordion() {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
      <AccordionPrimitive.Root type="multiple" className="space-y-2">
        {faqs.map((faq, i) => (
          <AccordionPrimitive.Item
            key={i}
            value={`faq-${i}`}
            className="rounded-xl border border-[var(--border)] overflow-hidden"
          >
            <AccordionPrimitive.Header>
              <AccordionPrimitive.Trigger
                className={cn(
                  'flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-left',
                  'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                  'data-[state=open]:bg-slate-50 dark:data-[state=open]:bg-slate-800/50',
                  '[&[data-state=open]>svg]:rotate-180'
                )}
              >
                {faq.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200" />
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
            <AccordionPrimitive.Content
              className={cn(
                'text-sm text-[var(--muted-foreground)] leading-relaxed',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'overflow-hidden data-[state=closed]:h-0 data-[state=open]:h-auto',
                'px-5 pb-4 pt-0'
              )}
            >
              {faq.a}
            </AccordionPrimitive.Content>
          </AccordionPrimitive.Item>
        ))}
      </AccordionPrimitive.Root>
    </section>
  )
}
