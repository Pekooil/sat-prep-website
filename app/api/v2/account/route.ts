import { studentApiRoute } from '@/lib/v2/api/handlers'

export const runtime = 'nodejs'

export function DELETE(request: Request) {
  return studentApiRoute(request, 'deleteAccount', { mutation: true })
}

