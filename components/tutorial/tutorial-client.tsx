'use client'

import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import {
  CheckCircle2, Circle, ChevronDown, ExternalLink,
  HelpCircle, ArrowRight, Image, BookOpen, BarChart2,
  Download, PenLine, RotateCcw, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { COLLEGE_BOARD_QB_URL } from '@/lib/constants'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TutorialStep {
  id: number
  title: string
  description: string
  detail: string
  screenshotAlt: string
  screenshotHint: string
  helpItems: { q: string; a: string }[]
  icon: React.ReactNode
  badge?: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'Go to the College Board Question Bank',
    description:
      'Open the official College Board Digital SAT Question Bank in your browser. You must be signed in to your College Board account to access questions.',
    detail:
      'The Question Bank is a free, official resource provided by the College Board. It contains hundreds of real Digital SAT questions organized by section, domain, skill, and difficulty — exactly the categories your study plan uses.',
    screenshotAlt: 'College Board Question Bank homepage',
    screenshotHint: 'College Board QB homepage\n— Section filter on the left\n— Domain / Skill / Difficulty menus at the top\n— Question cards in the main area',
    helpItems: [
      {
        q: 'Do I need a College Board account?',
        a: 'Yes. Create a free account at collegeboard.org if you do not have one. The same account you use for Bluebook or Khan Academy SAT Prep works here.',
      },
      {
        q: 'What is the College Board Question Bank?',
        a: 'It is the official, free repository of Digital SAT practice questions maintained by the College Board. Questions are identical in format to the actual Digital SAT, sorted by domain, skill, and difficulty.',
      },
      {
        q: 'Can I access the Question Bank on mobile?',
        a: 'The Question Bank website works in most modern mobile browsers, but a desktop or laptop gives you the best experience for filtering and downloading questions.',
      },
    ],
    icon: <ExternalLink className="h-5 w-5" />,
  },
  {
    id: 2,
    title: 'Select the Section',
    description:
      'Choose Reading & Writing or Math from the section selector at the top of the page. Your task drawer on the Calendar page tells you which section to practice for each scheduled session.',
    detail:
      'The Digital SAT has two scored sections: Reading & Writing and Math. Every task in your study plan is assigned to one section. Always match the section in the QB to the subject shown in your calendar task.',
    screenshotAlt: 'Section selector showing Reading & Writing and Math options',
    screenshotHint: 'Section selector\n— "Reading & Writing" tab (left)\n— "Math" tab (right)\n— Active tab highlighted in blue',
    helpItems: [
      {
        q: 'Where do I find which section to select?',
        a: 'Open the task in your Calendar by clicking on it. The task drawer shows the subject (Reading & Writing or Math) next to the book icon near the top of the drawer.',
      },
      {
        q: 'What is the difference between the two sections?',
        a: 'Reading & Writing covers information retrieval, craft, structure, expression, and conventions. Math covers algebra, advanced math, problem-solving & data analysis, and geometry & trigonometry. Your study plan may assign sessions from both sections on the same week.',
      },
      {
        q: 'Can I switch sections mid-session?',
        a: 'Yes. The filters reset when you switch sections. Just reapply your domain, skill, and difficulty filters after switching.',
      },
    ],
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: 3,
    title: 'Apply Topic Filters (Domain & Skill)',
    description:
      'Set the Domain and Skill filters to exactly match the filters listed in your Calendar task drawer. Copy them precisely — the planner selected these because they are your highest-priority areas right now.',
    detail:
      'Filters narrow the question pool to the specific topic your plan targets. Your task drawer shows the exact Domain and Skill labels to enter. These labels match the College Board\'s own filter names in the QB, so the text should match exactly.',
    screenshotAlt: 'Domain and Skill filter menus on the QB site',
    screenshotHint: 'Filter panel\n— Domain dropdown expanded (e.g., "Craft and Structure")\n— Skill dropdown below (e.g., "Words in context")\n— Applied filters shown as chips above the question list',
    helpItems: [
      {
        q: 'Where are the domain and skill filters in my study plan?',
        a: 'Click any task on the Calendar page. The right-side task drawer shows a blue "College Board Question Bank Filters" card with the Domain, Skill, and Difficulty you should enter.',
      },
      {
        q: 'What if my exact skill is not listed in the QB?',
        a: 'Use the closest matching option. Occasionally the QB groups sub-skills slightly differently. If you cannot find an exact match, select the parent domain only and do not filter by skill — you will still practice relevant questions.',
      },
      {
        q: 'Can I select multiple skills at once?',
        a: 'The QB allows multi-select in some filter menus. For focused practice, select only the single skill your plan recommends. Mixing skills reduces the targeted benefit.',
      },
      {
        q: 'Why does the planner pick specific skills for me?',
        a: 'The adaptive engine ranks every domain by your accuracy gap versus the 90% mastery target, weighted by the score impact of that domain. The skill with the largest gap gets scheduled first.',
      },
    ],
    icon: <BarChart2 className="h-5 w-5" />,
    badge: 'Most Important',
  },
  {
    id: 4,
    title: 'Set the Difficulty',
    description:
      'Apply the difficulty filter shown in your task drawer: Easy, Medium, or Hard. Your plan assigns difficulty based on which phase of preparation you are in — do not skip to harder questions before you are ready.',
    detail:
      'The study plan engine moves you through four phases: Foundation (easy), Skill (medium), Advanced (hard), and Strategy (mixed). Sticking to the recommended difficulty builds mastery progressively and keeps your accuracy on track toward the 90% target.',
    screenshotAlt: 'Difficulty filter with Easy, Medium, and Hard options',
    screenshotHint: 'Difficulty filter\n— "Easy" chip (green)\n— "Medium" chip (yellow)\n— "Hard" chip (red)\n— Selected difficulty highlighted',
    helpItems: [
      {
        q: 'What if the recommended difficulty feels too easy?',
        a: 'Complete the session at the recommended level first. If your accuracy is above 90% consistently, the adaptive replanner will automatically advance your difficulty on future sessions when you log your results.',
      },
      {
        q: 'What if the recommended difficulty feels too hard?',
        a: 'Still complete the session. Getting below 70% accuracy will signal the replanner to dial back the difficulty and schedule more foundational work. Do not skip — the data from struggling sessions is valuable.',
      },
      {
        q: 'How does difficulty map to the Digital SAT?',
        a: 'Easy questions are generally accessible to most test-takers; Medium questions match the typical test-day challenge; Hard questions are near the top of the SAT scoring range. All difficulty labels are set by the College Board.',
      },
    ],
    icon: <ChevronRight className="h-5 w-5" />,
  },
  {
    id: 5,
    title: 'Export or Begin the Question Set',
    description:
      'Once your filters are applied and the question count matches your session target, either download the questions as a PDF or begin answering them directly in the QB. Your session target is shown in the task title (e.g., "· 15q").',
    detail:
      'The QB allows you to practice questions on-screen or export them as a PDF for offline review. Either method works — just make sure you note how many questions you attempted and how many you got correct so you can log your session accurately.',
    screenshotAlt: 'Export PDF button on the QB results page',
    screenshotHint: 'Question Bank results page\n— "Export as PDF" button (top right)\n— Question count badge showing filtered total\n— "Start Practice" button for on-screen mode',
    helpItems: [
      {
        q: 'How many questions should I do?',
        a: 'Your task title shows a target question count (e.g., "· 15q"). Aim for that number. If the QB returns fewer than your target for the chosen filters, do all of them and note the actual count when you log the session.',
      },
      {
        q: 'Should I use the PDF or practice on-screen?',
        a: 'Either works for accuracy data. On-screen practice lets the QB track your answers automatically. PDF practice may feel more like test conditions. Choose whichever helps you focus.',
      },
      {
        q: 'The PDF export button is not visible — what do I do?',
        a: 'The export option may require you to have applied at least one filter and have a results list showing. Apply your filters, wait for the question list to load, then look for the export or download icon in the top-right of the results area.',
      },
      {
        q: 'Does the QB save my answers?',
        a: 'When practicing on-screen, the QB records which answers you selected. For PDF practice, you track answers yourself — use a separate sheet to record each question number and your answer before checking.',
      },
    ],
    icon: <Download className="h-5 w-5" />,
  },
  {
    id: 6,
    title: 'Complete the Assigned Questions',
    description:
      'Work through all the questions at your recommended pace — about 71 seconds per question for Reading & Writing and 95 seconds for Math. Review the answer explanations for every question you get wrong.',
    detail:
      'Practicing at exam pace builds the time management skills you need on test day. After finishing, review the College Board\'s explanations for every incorrect answer. Write down your reasoning error in the Error Log (do not paste question text).',
    screenshotAlt: 'Student working through QB questions with a timer',
    screenshotHint: 'Study session\n— QB question on screen (or PDF printout)\n— Answer sheet or scratch paper\n— Timer running (71s or 95s per question)\n— Answer key for review after submission',
    helpItems: [
      {
        q: 'What is the recommended time per question?',
        a: 'The Digital SAT paces Reading & Writing at about 71 seconds per question and Math at about 95 seconds per question. The session timer in the Log Session dialog uses these exact rates, so practicing at this pace prepares you for real test conditions.',
      },
      {
        q: 'Should I guess on questions I am unsure about?',
        a: 'Yes — the Digital SAT has no penalty for wrong answers. On the QB, always select an answer even if you are unsure. The accuracy data you log is most useful when it reflects your real test-taking behavior.',
      },
      {
        q: 'How should I review wrong answers?',
        a: 'After seeing which answers were wrong, read the College Board\'s official explanation. Then open the Error Log in SaturnPath and write a short note about your mistake — but do not paste any question text. Describe what you misunderstood in your own words.',
      },
      {
        q: 'What if I run out of time mid-session?',
        a: 'Log however many questions you completed and answered. Partial session data is still useful for the replanner. You can schedule another session for the same skill on a future day.',
      },
    ],
    icon: <PenLine className="h-5 w-5" />,
  },
  {
    id: 7,
    title: 'Return to SaturnPath & Log Your Session',
    description:
      'Come back to the Calendar, open the task drawer, and click "Log Session." Enter the number of questions you attempted and how many you answered correctly. The adaptive engine will update your plan immediately.',
    detail:
      'Logging your session is the most important step — it is how the planner learns. Your accuracy data triggers a full replanning pass that re-ranks all eight domains, adjusts future difficulty, and updates your predicted score. The plan only adapts when you log.',
    screenshotAlt: 'Log Session dialog in SaturnPath',
    screenshotHint: 'SaturnPath — Log Session dialog\n— Questions attempted field\n— Questions correct field\n— Timer showing time used\n— A/B/C/D per-question entry\n— "Submit" button',
    helpItems: [
      {
        q: 'What happens when I submit a session log?',
        a: 'The adaptive replanner runs immediately. It recalculates accuracy gaps for all domains, re-ranks priorities, adjusts difficulty for future sessions, and shows you a "Plan Updated" screen with the specific changes and your new predicted score.',
      },
      {
        q: 'Do I log every question individually?',
        a: 'The Session Workflow dialog lets you enter your answer (A/B/C/D) and the correct answer for each question individually, or you can enter totals only. Entering per-question detail enables better error tracking.',
      },
      {
        q: 'What if I forgot to count my correct answers?',
        a: 'Go back and check your answer key or the QB review screen. Accurate counts matter — entering a rough estimate skews the replanner. Take a moment to tally before logging.',
      },
      {
        q: 'Can I also log errors from this session?',
        a: 'Yes. After logging the session, go to the Error Log page and add entries for specific mistakes. Each error log entry triggers another small replanning pass. This is how the planner knows to revisit problem areas.',
      },
      {
        q: 'What if I skip logging a session?',
        a: 'The planner will not adapt. Your future tasks will stay at the same difficulty and priority as before. Always log your sessions, even if you only completed a few questions.',
      },
    ],
    icon: <RotateCcw className="h-5 w-5" />,
    badge: 'Close the Loop',
  },
]

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Is the College Board Question Bank free?',
    a: 'Yes. The QB is completely free for all students. You only need a College Board account, which is also free to create at collegeboard.org.',
  },
  {
    q: 'Does SaturnPath access the QB on my behalf?',
    a: 'No. The planner only tells you which filters to apply. You visit the QB directly in your browser. We never scrape, proxy, or access College Board\'s systems.',
  },
  {
    q: 'Will I see the same question twice?',
    a: 'The QB may show questions you have seen before if the filtered pool is small. The College Board adds new questions periodically. If you exhaust a category, move to the next skill in your plan.',
  },
  {
    q: 'Can I use Khan Academy instead of the QB?',
    a: 'Khan Academy SAT Prep is a good supplementary resource, but the SaturnPath generates filters specifically aligned to the College Board QB categories. Log your sessions with the question counts from whichever source you use.',
  },
  {
    q: 'What if I miss a scheduled session?',
    a: 'No problem. The calendar marks the task as upcoming until you log it. If you miss several days, consider using the planner\'s manual reschedule (drag-and-drop on the Calendar page) to shift tasks to new dates.',
  },
  {
    q: 'How do I know which task to do each day?',
    a: 'Open the Calendar page. Tasks are displayed by date with color-coded domain labels. Click any task to see its full QB filter details, instructions, and the Log Session button.',
  },
  {
    q: 'Do I need to do all the questions in the QB, or just the ones in my plan?',
    a: 'Only do the number shown in your task (e.g., "· 15q"). Doing more is fine if you have extra time, but log only the planned count for the session so the replanner stays calibrated.',
  },
  {
    q: 'What is a PDF export and why would I use it?',
    a: 'The QB\'s export feature downloads your filtered questions as a PDF you can print or view offline. Use it if you prefer pen-and-paper practice or want to study away from a screen. There is no difference in question content.',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScreenshotPlaceholder({ alt, hint }: { alt: string; hint: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        'relative w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600',
        'bg-slate-50 dark:bg-slate-800/40 overflow-hidden',
        'aspect-[16/7] flex flex-col items-center justify-center gap-3',
      )}
    >
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
        <Image className="h-5 w-5" />
      </div>
      <div className="text-center px-4">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          Screenshot Placeholder
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
          {hint}
        </p>
      </div>
      <div className="absolute inset-x-0 top-0 h-6 bg-slate-200/60 dark:bg-slate-700/60 flex items-center gap-1.5 px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
        <span className="ml-2 text-[10px] text-slate-400 dark:text-slate-500 truncate">{alt}</span>
      </div>
    </div>
  )
}

function HelpAccordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <AccordionPrimitive.Root type="multiple" className="space-y-1.5">
      {items.map((item, i) => (
        <AccordionPrimitive.Item
          key={i}
          value={`help-${i}`}
          className="rounded-lg border border-[var(--border)] overflow-hidden"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger
              className={cn(
                'flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-left',
                'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                'data-[state=open]:bg-slate-50 dark:data-[state=open]:bg-slate-800/50',
                '[&[data-state=open]>svg:last-child]:rotate-180',
              )}
            >
              <HelpCircle className="h-3.5 w-3.5 flex-shrink-0 text-violet-500" />
              <span className="flex-1 text-[var(--foreground)]">{item.q}</span>
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-200" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content
            className={cn(
              'text-sm text-[var(--muted-foreground)] leading-relaxed',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'overflow-hidden data-[state=closed]:h-0 data-[state=open]:h-auto',
              'px-4 pb-3 pt-0 ml-6',
            )}
          >
            {item.a}
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}

function StepCard({
  step,
  completed,
  onToggle,
}: {
  step: TutorialStep
  completed: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-colors',
        completed
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
          : 'border-[var(--border)] bg-[var(--card)]',
      )}
    >
      {/* Step header */}
      <div className="flex items-start gap-4 p-5 pb-4">
        <button
          onClick={onToggle}
          aria-label={completed ? `Mark step ${step.id} incomplete` : `Mark step ${step.id} complete`}
          className="mt-0.5 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-full"
        >
          {completed ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : (
            <Circle className="h-6 w-6 text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500 transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Step {step.id} of {STEPS.length}
            </span>
            {step.badge && (
              <Badge className="text-[10px] py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {step.badge}
              </Badge>
            )}
            {completed && (
              <Badge variant="success" className="text-[10px] py-0">
                Done
              </Badge>
            )}
          </div>
          <h2 className="text-base font-semibold text-[var(--foreground)] leading-snug">
            {step.title}
          </h2>
        </div>
        <div
          className={cn(
            'flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center',
            completed
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400',
          )}
        >
          {step.icon}
        </div>
      </div>

      {/* Screenshot */}
      <div className="px-5">
        <ScreenshotPlaceholder alt={step.screenshotAlt} hint={step.screenshotHint} />
      </div>

      {/* Description */}
      <div className="px-5 pt-4 space-y-2">
        <p className="text-sm text-[var(--foreground)] leading-relaxed font-medium">
          {step.description}
        </p>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
          {step.detail}
        </p>
      </div>

      {/* QB link on step 1 */}
      {step.id === 1 && (
        <div className="px-5 pt-3">
          <a
            href={COLLEGE_BOARD_QB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:underline font-medium"
          >
            Open College Board Question Bank
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Help accordion */}
      <div className="px-5 pt-4 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2 flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" />
          Common Questions for This Step
        </p>
        <HelpAccordion items={step.helpItems} />
      </div>

      {/* Mark complete button */}
      <div className="px-5 pb-5 pt-0">
        <button
          onClick={onToggle}
          className={cn(
            'w-full rounded-lg py-2.5 text-sm font-medium transition-colors border',
            completed
              ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
          )}
        >
          {completed ? '✓ Marked as complete — click to undo' : 'Mark this step as complete'}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'sat-planner-tutorial-progress'

export function TutorialClient() {
  const [completed, setCompleted] = React.useState<boolean[]>(() =>
    Array(STEPS.length).fill(false),
  )
  const [hydrated, setHydrated] = React.useState(false)

  // Load from localStorage after hydration
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length === STEPS.length) {
          setCompleted(parsed)
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  // Persist on change
  React.useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed))
  }, [completed, hydrated])

  const completedCount = completed.filter(Boolean).length
  const progressPct = Math.round((completedCount / STEPS.length) * 100)
  const allDone = completedCount === STEPS.length

  function toggle(index: number) {
    setCompleted(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  function resetAll() {
    setCompleted(Array(STEPS.length).fill(false))
  }

  return (
    <div className="space-y-10 max-w-3xl mx-auto pb-16">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          College Board Question Bank Tutorial
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1.5 leading-relaxed">
          Follow these seven steps every time you have a practice session on your calendar.
          Check off each step as you complete it — your progress is saved automatically.
        </p>
      </div>

      {/* ── Progress tracker ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {allDone ? 'Tutorial complete!' : 'Your progress'}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {completedCount} of {STEPS.length} steps completed
            </p>
          </div>
          <div className="flex items-center gap-3">
            {allDone && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                All done
              </span>
            )}
            <button
              onClick={resetAll}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>

        <Progress value={progressPct} className="h-2.5" />

        {/* Step pills */}
        <div className="flex flex-wrap gap-2">
          {STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => {
                const el = document.getElementById(`step-${step.id}`)
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                completed[i]
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
              )}
            >
              {completed[i] ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-current flex items-center justify-center text-[8px] font-bold">
                  {step.id}
                </span>
              )}
              {step.id}
            </button>
          ))}
        </div>

        {allDone && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                You know the workflow!
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                Head to the Calendar to start your first session.
              </p>
            </div>
            <Button size="sm" asChild className="ml-auto flex-shrink-0">
              <Link href="/calendar">
                Go to Calendar
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* ── Step cards ── */}
      <div className="space-y-8">
        {STEPS.map((step, i) => (
          <div key={step.id} id={`step-${step.id}`} className="scroll-mt-20">
            <StepCard
              step={step}
              completed={completed[i]}
              onToggle={() => toggle(i)}
            />
            {i < STEPS.length - 1 && (
              <div className="flex justify-center mt-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-4 w-px bg-[var(--border)]" />
                  <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] rotate-90" />
                  <div className="h-4 w-px bg-[var(--border)]" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── FAQ ── */}
      <section>
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Common questions about the College Board QB workflow.
          </p>
        </div>
        <AccordionPrimitive.Root type="multiple" className="space-y-2">
          {FAQS.map((faq, i) => (
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
                    '[&[data-state=open]>svg]:rotate-180',
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
                  'px-5 pb-4 pt-0',
                )}
              >
                {faq.a}
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          ))}
        </AccordionPrimitive.Root>
      </section>

      {/* ── Bottom CTA ── */}
      <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-semibold text-violet-800 dark:text-violet-200">
            Ready to start studying?
          </p>
          <p className="text-sm text-violet-600 dark:text-violet-400 mt-0.5">
            Open your Calendar to see today's task and get your QB filters.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" asChild>
            <a href={COLLEGE_BOARD_QB_URL} target="_blank" rel="noopener noreferrer">
              Open QB
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
          <Button size="sm" asChild>
            <Link href="/calendar">
              Go to Calendar
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
