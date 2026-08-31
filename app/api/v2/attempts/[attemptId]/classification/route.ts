import { studentApiRoute } from '@/lib/v2/api/handlers'
import { requireUuid } from '@/lib/v2/api/request'
import { classifyAttempt } from '@/lib/v2/student'
import { jsonResponse } from '@/lib/v2/api/response'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params
  return studentApiRoute(request, 'classifyAttempt', {
    mutation: true,
    before: () => requireUuid(attemptId, 'attemptId'),
    handler: async ({ user, requestId }, body = {}) => jsonResponse(await classifyAttempt(
      user.id,
      attemptId,
      typeof body.classification === 'string' ? body.classification : '',
      typeof body.detail === 'string' ? body.detail : null,
      request.headers.get('idempotency-key')!.trim(),
    ), 200, requestId),
  })
}
