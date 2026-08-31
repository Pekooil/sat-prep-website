import { studentApiRoute } from '@/lib/v2/api/handlers'
import { getReviewItems } from '@/lib/v2/student'
import { jsonResponse } from '@/lib/v2/api/response'

export const runtime = 'nodejs'

export function GET(request: Request) {
  const state = new URL(request.url).searchParams.get('state')
  return studentApiRoute(request, 'getReviewItems', {
    handler: async ({ user, requestId }) => jsonResponse(await getReviewItems(user.id, state), 200, requestId),
  })
}
