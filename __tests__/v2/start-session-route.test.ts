import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockNextQuestion, mockStartSession } = vi.hoisted(() => ({
  mockNextQuestion: vi.fn(),
  mockStartSession: vi.fn(),
}))

vi.mock('@/lib/v2/student', () => ({
  nextQuestion: mockNextQuestion,
  startSession: mockStartSession,
}))

vi.mock('@/lib/v2/api/handlers', () => ({
  studentApiRoute: async (
    request: Request,
    _operation: string,
    options: {
      handler: (
        context: { user: { id: string }; requestId: string },
        body: Record<string, unknown>,
      ) => Promise<Response>
    },
  ) => options.handler(
    { user: { id: 'user-1' }, requestId: 'request-1' },
    await request.json(),
  ),
}))

import { POST } from '@/app/api/v2/sessions/route'

const session = {
  id: 'session-1',
  state: 'active',
  recommendedMinutes: 10,
  actualMinutes: 0,
  currentMicroSet: 1,
  startedAt: '2026-09-07T12:00:00.000Z',
  endedAt: null,
}

const firstQuestion = {
  sessionId: 'session-1',
  microSetNumber: 1,
  question: { questionId: 'question-1' },
}

function startRequest(includeFirstQuestion?: boolean) {
  return new Request('https://saturnpath.app/api/v2/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'practice-request-0001',
      'X-Client-Version': 'web-v2.1',
    },
    body: JSON.stringify({
      dailyRecommendationId: 'recommendation-1',
      resumeIfAvailable: true,
      ...(includeFirstQuestion === undefined ? {} : { includeFirstQuestion }),
    }),
  })
}

describe('V2 session start route', () => {
  beforeEach(() => {
    mockStartSession.mockReset().mockResolvedValue(session)
    mockNextQuestion.mockReset().mockResolvedValue(firstQuestion)
  })

  it('can return the first question in the start response', async () => {
    const response = await POST(startRequest(true))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ ...session, firstQuestion })
    expect(mockNextQuestion).toHaveBeenCalledWith('user-1', 'session-1')
  })

  it('preserves the existing session-only response by default', async () => {
    const response = await POST(startRequest())

    expect(await response.json()).toEqual(session)
    expect(mockNextQuestion).not.toHaveBeenCalled()
  })
})
