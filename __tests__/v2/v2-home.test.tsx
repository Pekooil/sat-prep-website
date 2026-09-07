import * as React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { V2Home } from '@/components/v2-product/v2-home'

const { mockV2Fetch } = vi.hoisted(() => ({ mockV2Fetch: vi.fn() }))

vi.mock('@/components/v2-product/v2-api', () => ({
  idempotencyKey: () => 'practice-request-0001',
  v2Fetch: mockV2Fetch,
}))

const home = {
  scoreEstimate: 1180,
  scoreEstimateLow: 1150,
  scoreEstimateHigh: 1210,
  targetScore: 1400,
  minutesSaved: 5,
  rings: [],
  recommendation: {
    id: 'recommendation-1',
    totalMinutes: 20,
    newMinutes: 15,
    reviewMinutes: 5,
    whySelected: ['Based on your latest practice signals'],
  },
}

describe('V2 practice start experience', () => {
  beforeEach(() => mockV2Fetch.mockReset())

  it('shows immediate, specific progress while the first question loads', async () => {
    let resolveSession!: (value: unknown) => void
    const session = new Promise((resolve) => { resolveSession = resolve })
    mockV2Fetch
      .mockResolvedValueOnce(home)
      .mockReturnValueOnce(session)

    render(<V2Home />)
    await userEvent.click(await screen.findByRole('button', { name: /start practicing/i }))

    expect(screen.getByRole('heading', { name: /preparing your first question/i })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Starting practice…')
    expect(screen.getByLabelText('Scratchpad loading')).toBeVisible()
    expect(screen.queryByRole('button', { name: /start practicing/i })).not.toBeInTheDocument()

    resolveSession({
      id: 'session-1',
      firstQuestion: {
        sessionId: 'session-1',
        microSetNumber: 1,
        question: {
          questionId: 'question-1',
          versionId: 'version-1',
          section: 'math',
          subskillKey: 'linear_equations',
          responseType: 'mcq',
          stem: 'What is 2 + 2?',
          choices: [
            { id: 'a', content: '3' },
            { id: 'b', content: '4' },
          ],
          expectedSeconds: 60,
        },
      },
    })

    expect(await screen.findByRole('heading', { name: 'Think it through.' })).toBeVisible()
    expect(mockV2Fetch).toHaveBeenCalledTimes(2)
    expect(JSON.parse(mockV2Fetch.mock.calls[1][1].body)).toMatchObject({
      includeFirstQuestion: true,
    })
  })

  it('shows a start failure beside the button instead of outside the viewport', async () => {
    mockV2Fetch
      .mockResolvedValueOnce(home)
      .mockRejectedValueOnce(new Error('Practice is not enabled for this environment'))

    render(<V2Home />)
    const startButton = await screen.findByRole('button', { name: /start practicing/i })
    await userEvent.click(startButton)

    const retryButton = await screen.findByRole('button', { name: /start practicing/i })
    await waitFor(() => expect(retryButton).toBeEnabled())
    const practiceCard = retryButton.closest('section')
    expect(practiceCard).not.toBeNull()
    expect(within(practiceCard!).getByRole('alert')).toHaveTextContent(
      'Practice is not enabled for this environment',
    )
  })
})
