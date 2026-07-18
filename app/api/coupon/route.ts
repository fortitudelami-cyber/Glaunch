import { getAuthedUser, unauthorized } from '@/lib/api-auth'
import { getUser, updateUser } from '@/lib/data'

export const runtime = 'nodejs'

/**
 * Redeem a premium access coupon. Replaces paid checkout: a valid coupon upgrades
 * the account to premium. Code lives server-side in PREMIUM_COUPON_CODE
 * (defaults to SAFEHAVEN) and is never exposed to the browser.
 */
export async function POST(req: Request) {
  try {
    const authed = await getAuthedUser()
    if (!authed) return unauthorized()

    const body = (await req.json().catch(() => ({}))) as { code?: string }
    const submitted = (body.code ?? '').trim()
    if (!submitted) {
      return Response.json({ error: 'Enter a coupon code.' }, { status: 400 })
    }

    const validCode = (process.env.PREMIUM_COUPON_CODE ?? 'SAFEHAVEN').trim()
    if (submitted.toUpperCase() !== validCode.toUpperCase()) {
      return Response.json({ error: 'Invalid coupon code.' }, { status: 400 })
    }

    const existing = await getUser(authed.userId)
    if (!existing) {
      return Response.json({ error: 'Account not found. Try again after signing in.' }, { status: 404 })
    }
    await updateUser(authed.userId, { plan: 'premium' })
    return Response.json({ success: true, plan: 'premium' })
  } catch (err) {
    console.log('[coupon] error:', (err as Error).message)
    return Response.json(
      { error: (err as Error).message || 'Could not redeem coupon.' },
      { status: 500 },
    )
  }
}
