import { studentApiRoute } from '@/lib/v2/api/handlers'
import { requireUuid } from '@/lib/v2/api/request'
import { submitAttempt } from '@/lib/v2/student'
import { jsonResponse } from '@/lib/v2/api/response'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return studentApiRoute(request, 'submitAttempt', {
    mutation: true,
    clientVersion: true,
    rateLimit: { limit: 60, windowMs: 60_000 },
    before: () => requireUuid(sessionId, 'sessionId'),
    handler: async ({ user, requestId }, body = {}) => jsonResponse(await submitAttempt(user.id, { ...body, sessionId }, request.headers.get('idempotency-key')!.trim()), 200, requestId),
  })
}
