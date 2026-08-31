import { studentApiRoute } from '@/lib/v2/api/handlers'
import { requireUuid } from '@/lib/v2/api/request'
import { actOnReviewItem } from '@/lib/v2/student'
import { jsonResponse } from '@/lib/v2/api/response'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: Promise<{ reviewItemId: string }> }) {
  const { reviewItemId } = await params
  return studentApiRoute(request, 'actOnReviewItem', {
    mutation: true,
    before: () => requireUuid(reviewItemId, 'reviewItemId'),
    handler: async ({ user, requestId }, body = {}) => jsonResponse(await actOnReviewItem(
      user.id,
      reviewItemId,
      typeof body.action === 'string' ? body.action : '',
      request.headers.get('idempotency-key')!.trim(),
    ), 200, requestId),
  })
}
