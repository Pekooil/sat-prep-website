import { studentApiRoute } from '@/lib/v2/api/handlers'
import { nextQuestion, startSession } from '@/lib/v2/student'
import { jsonResponse } from '@/lib/v2/api/response'
import { requireFeature } from '@/lib/v2/api/request'
import { getV2FeatureFlags } from '@/lib/v2/config/feature-flags'

export const runtime = 'nodejs'

export function POST(request: Request) {
  return studentApiRoute(request, 'startOrResumeSession', {
    mutation: true,
    clientVersion: true,
    rateLimit: { limit: 30, windowMs: 60_000 },
    before: () => requireFeature(getV2FeatureFlags().practiceEnabled, 'V2 practice is not enabled for this environment'),
    handler: async ({ user, requestId }, body = {}) => {
      const session = await startSession(
        user.id,
        typeof body.dailyRecommendationId === 'string' ? body.dailyRecommendationId : null,
        body.resumeIfAvailable !== false,
        request.headers.get('x-client-version')?.trim() ?? 'web-local',
        request.headers.get('idempotency-key')!.trim(),
      )

      if (body.includeFirstQuestion !== true) {
        return jsonResponse(session, 201, requestId)
      }

      const firstQuestion = await nextQuestion(user.id, session.id as string)
      return jsonResponse({ ...session, firstQuestion }, 201, requestId)
    },
  })
}
