import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/resume(.*)',
  '/matches(.*)',
  '/apply(.*)',
  '/interview(.*)',
  '/onboarding(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const url = new URL(req.url)
  const pathname = url.pathname

  const skipRedirect =
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/api/')

  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  if (skipRedirect) return

  const userId = auth.userId
  if (!userId) return

  try {
    const profileRes = await fetch(`${url.origin}/api/user/profile?userId=${userId}`, {
      cache: 'no-store',
    })

    if (!profileRes.ok) return NextResponse.redirect(new URL('/onboarding', url))

    const profile = await profileRes.json()
    const profileComplete = typeof profile?.profileComplete === 'number' ? profile.profileComplete : 0

    if (!profile || profileComplete < 10) {
      return NextResponse.redirect(new URL('/onboarding', url))
    }
  } catch (err) {
    console.warn('Middleware profile check failed:', err)
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
