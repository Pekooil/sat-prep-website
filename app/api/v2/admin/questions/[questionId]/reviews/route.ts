import { adminApiRoute } from '@/lib/v2/api/handlers'
import { requireUuid } from '@/lib/v2/api/request'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params
  return adminApiRoute(request, 'reviewQuestionVersion', {
    mutation: true,
    rateLimit: { limit: 60, windowMs: 60_000 },
    before: () => requireUuid(questionId, 'questionId'),
  })
}

