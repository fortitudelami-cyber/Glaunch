import { getAuthedUser, unauthorized } from '@/lib/api-auth'

export const runtime = 'nodejs'

/**
 * Paid checkout has been replaced by coupon-based premium access.
 * Kept as a stable endpoint so old clients get a clear signal (not a 404);
 * it starts no payment flow.
 */
export async function POST() {
  const authed = await getAuthedUser()
  if (!authed) return unauthorized()
  return Response.json(
    { error: 'Paid checkout is disabled. Premium is unlocked with a coupon code.', coupon: true },
    { status: 410 },
  )
}
