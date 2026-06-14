import { getAuthedUser, unauthorized } from '@/lib/api-auth'
import { putItem, keys } from '@/lib/dynamodb'

export async function POST(req: Request) {
  const authed = await getAuthedUser()
  if (!authed) return unauthorized()

  const body = await req.json().catch(() => ({}))

  const item = {
    PK: keys.userPk(authed.userId),
    SK: keys.userProfileSk(),
    entity: 'USER',
    userId: authed.userId,
    email: authed.email,
    fullName: body.fullName ?? authed.fullName,
    country: body.country ?? '',
    university: body.university ?? '',
    graduationYear: body.graduationYear ?? '',
    fieldOfStudy: body.fieldOfStudy ?? '',
    role: body.role ?? 'student',
    plan: 'free',
    atsScore: 0,
    profileComplete: body.profileComplete ?? 50,
    resumeText: body.resumeText ?? '',
    cvFileName: body.cvFileName ?? undefined,
    createdAt: new Date().toISOString(),
  }

  await putItem(item)

  return Response.json({ success: true })
}
