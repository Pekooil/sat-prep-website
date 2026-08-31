import { studentApiRoute } from '@/lib/v2/api/handlers'
import { updateProfile } from '@/lib/v2/student'
import { jsonResponse } from '@/lib/v2/api/response'

export const runtime = 'nodejs'

export function PATCH(request: Request) {
  return studentApiRoute(request, 'updateProfile', {
    mutation: true,
    handler: async ({ user, requestId }, body = {}) => jsonResponse(await updateProfile(user.id, body), 200, requestId),
  })
}
