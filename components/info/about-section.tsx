import { BookOpen, Brain, BarChart3, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const steps = [
  {
    icon: Brain,
    title: '1. Generate Your AI Plan',
    description:
      'Enter your current score, target, and test date. Our AI creates a personalized week-by-week study roadmap tailored to your weak areas.',
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  },
  {
    icon: BookOpen,
    title: '2. Practice on College Board',
    description:
      'Your plan recommends specific College Board Question Bank filters. Practice directly on the official platform — we never reproduce questions.',
    color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  },
  {
    icon: AlertCircle,
    title: '3. Log Errors & Track Mastery',
    description:
      'After each session, log your mistakes with the Error Log. Track patterns, mark errors as mastered, and watch your weak spots shrink.',
    color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  },
  {
    icon: BarChart3,
    title: '4. Monitor Your Progress',
    description:
      'Log scores after every practice test and see your improvement over time in the Data tab with visual charts and accuracy breakdowns.',
    color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  },
]

export function AboutSection() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
        <h2 className="text-xl font-bold">About SaturnPath</h2>
        <p className="mt-2 text-blue-100 text-sm leading-relaxed">
          SaturnPath is a smart, personalized preparation platform that helps students maximize their
          SAT score through data-driven planning, error tracking, and AI-powered guidance.
        </p>
        <div className="mt-4 rounded-xl bg-white/10 p-4 border border-white/20">
          <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-1">Copyright Notice</p>
          <p className="text-sm text-blue-100">
            This platform does <strong className="text-white">not</strong> display, store, reproduce, or distribute
            any SAT questions or College Board content. All practice questions must be accessed directly from the
            official College Board website. We only store your personal study plans, progress data, and error logs.
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">How It Works</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {steps.map(({ icon: Icon, title, description, color }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm mb-1">{title}</h4>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
