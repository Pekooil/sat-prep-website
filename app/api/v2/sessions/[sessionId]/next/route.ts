import { studentApiRoute } from '@/lib/v2/api/handlers'
import { requireUuid } from '@/lib/v2/api/request'
import { nextQuestion } from '@/lib/v2/student'
import { jsonResponse } from '@/lib/v2/api/response'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return studentApiRoute(request, 'getNextQuestion', {
    before: () => requireUuid(sessionId, 'sessionId'),
    handler: async ({ user, requestId }) => jsonResponse(await nextQuestion(user.id, sessionId), 200, requestId),
  })
}
