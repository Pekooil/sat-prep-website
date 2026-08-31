import { studentApiRoute } from '@/lib/v2/api/handlers'
import { getHome } from '@/lib/v2/student'
import { jsonResponse } from '@/lib/v2/api/response'

export const runtime = 'nodejs'

export function GET(request: Request) {
  return studentApiRoute(request, 'getHome', {
    handler: async ({ user, requestId }) => jsonResponse(await getHome(user.id), 200, requestId),
  })
}
