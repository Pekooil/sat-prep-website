import { studentApiRoute } from '@/lib/v2/api/handlers'
import { requireUuid } from '@/lib/v2/api/request'
import { endSession } from '@/lib/v2/student'
import { jsonResponse } from '@/lib/v2/api/response'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return studentApiRoute(request, 'endSession', {
    mutation: true,
    before: () => requireUuid(sessionId, 'sessionId'),
    handler: async ({ user, requestId }, body = {}) => jsonResponse(await endSession(
      user.id,
      sessionId,
      typeof body.reason === 'string' ? body.reason : 'user_stop',
      request.headers.get('idempotency-key')!.trim(),
    ), 200, requestId),
  })
}
