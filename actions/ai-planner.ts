'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/openai'
import type { AIPlanRequest, AIStudyPlan } from '@/types'

export async function generateAIStudyPlan(request: AIPlanRequest): Promise<{ data?: AIStudyPlan; error?: string }> {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    const openai = getOpenAIClient()

    const testDateObj = new Date(request.testDate)
    const today = new Date()
    const daysUntil = Math.max(Math.ceil((testDateObj.getTime() - today.getTime()) / 86400000), 7)
    const weeksUntil = Math.ceil(daysUntil / 7)

    const prompt = `You are an expert SAT tutor. Create a detailed, week-by-week study plan.

Student Profile:
- Current SAT Score: ${request.currentScore || 'Not taken'}
- Target SAT Score: ${request.targetScore}
- SAT Test Date: ${request.testDate} (${weeksUntil} weeks away)
- Available Study Hours Per Week: ${request.hoursPerWeek}
- Math Score: ${request.mathScore || 'Unknown'}
- Reading & Writing Score: ${request.readingWritingScore || 'Unknown'}
- Weak Areas: ${request.weakAreas.join(', ') || 'General improvement needed'}

Create a study plan with ${Math.min(weeksUntil, 12)} weeks of tasks.

CRITICAL: Do NOT include any actual SAT questions. Only recommend College Board Question Bank filter settings (domain, skill, difficulty) that students should use when practicing on the official College Board website themselves.

Return ONLY valid JSON in this exact format:
{
  "title": "12-Week SAT Study Plan",
  "totalWeeks": 12,
  "overallStrategy": "Brief 2-sentence strategy",
  "weeks": [
    {
      "weekNumber": 1,
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "theme": "Foundation Building",
      "tasks": [
        {
          "day": "Monday",
          "subject": "math",
          "category": "Algebra",
          "durationMinutes": 60,
          "description": "What to study and how",
          "collegeBoardFilters": {
            "domain": "Algebra",
            "skill": "Linear equations in one variable",
            "difficulty": "easy"
          }
        }
      ]
    }
  ]
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const planData = JSON.parse(response.choices[0].message.content ?? '{}') as AIStudyPlan

    // Save the study plan to database
    const startDate = new Date().toISOString().split('T')[0]
    const planJson = JSON.parse(JSON.stringify(planData))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: savedPlan, error: planError } = await (supabase.from('study_plans') as any)
      .insert({
        user_id: user.id,
        title: planData.title,
        description: planData.overallStrategy,
        start_date: startDate,
        end_date: request.testDate,
        is_active: true,
        ai_generated: true,
        plan_data: planJson,
      })
      .select()
      .single()

    if (planError) return { error: planError.message }

    // Create calendar tasks from the plan
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tasksToInsert: any[] = []
    const startDateObj = new Date()

    for (const week of planData.weeks) {
      for (const task of week.tasks) {
        const dayOffset = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(task.day)
        const weekOffset = (week.weekNumber - 1) * 7
        const taskDate = new Date(startDateObj)
        taskDate.setDate(taskDate.getDate() + weekOffset + dayOffset)

        tasksToInsert.push({
          user_id: user.id,
          study_plan_id: savedPlan.id,
          title: `${task.category} — ${task.subject === 'math' ? 'Math' : 'Reading & Writing'}`,
          description: task.description,
          task_date: taskDate.toISOString().split('T')[0],
          duration_minutes: task.durationMinutes,
          subject: task.subject as 'math' | 'reading_writing' | 'both',
          category: task.category,
          is_completed: false,
          college_board_filters: task.collegeBoardFilters as unknown as Record<string, unknown>,
        })
      }
    }

    if (tasksToInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('calendar_tasks') as any).insert(tasksToInsert)
    }

    revalidatePath('/calendar')
    revalidatePath('/home')

    return { data: planData }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to generate plan' }
  }
}
