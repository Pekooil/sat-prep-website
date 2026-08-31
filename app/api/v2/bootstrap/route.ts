import { studentApiRoute } from '@/lib/v2/api/handlers'
import { getBootstrap } from '@/lib/v2/bootstrap'
import { jsonResponse } from '@/lib/v2/api/response'

export const runtime = 'nodejs'

export function GET(request: Request) {
  return studentApiRoute(request, 'getBootstrap', {
    handler: async ({ user, requestId }) => jsonResponse(await getBootstrap(user.id), 200, requestId),
  })
}
