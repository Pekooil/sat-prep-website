import { studentApiRoute } from '@/lib/v2/api/handlers'
import { getProgress } from '@/lib/v2/student'
import { jsonResponse } from '@/lib/v2/api/response'

export const runtime = 'nodejs'

export function GET(request: Request) {
  return studentApiRoute(request, 'getProgress', {
    handler: async ({ user, requestId }) => jsonResponse(await getProgress(user.id), 200, requestId),
  })
}
