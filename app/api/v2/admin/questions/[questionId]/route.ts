import { adminApiRoute } from '@/lib/v2/api/handlers'
import { requireUuid } from '@/lib/v2/api/request'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params
  return adminApiRoute(request, 'getAdminQuestion', {
    before: () => requireUuid(questionId, 'questionId'),
  })
}

