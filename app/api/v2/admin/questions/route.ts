import { adminApiRoute } from '@/lib/v2/api/handlers'

export const runtime = 'nodejs'

export function GET(request: Request) {
  return adminApiRoute(request, 'listAdminQuestions')
}

export function POST(request: Request) {
  return adminApiRoute(request, 'createQuestionDraft', {
    mutation: true,
    rateLimit: { limit: 30, windowMs: 60_000 },
  })
}

