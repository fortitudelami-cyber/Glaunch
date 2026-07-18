'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CouponRedeem } from '@/components/coupon/coupon-redeem'

type Plan = {
  id: 'free' | 'premium' | 'recruiter'
  name: string
  price: string
  cadence: string
  features: string[]
  cta: string
  accent: 'orange' | 'green'
  popular?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    features: [
      'Resume ATS score & analysis',
      '5 job matches per day',
      'Apply to unlimited roles',
      '3 interview practice sessions',
    ],
    cta: 'Get Started Free',
    accent: 'orange',
  },
  {
    id: 'premium',
    name: 'Premium Student',
    price: '$5',
    cadence: '/month',
    features: [
      'Everything in Free',
      'Unlimited smart matches',
      'Unlimited interview coaching',
      'Priority application visibility',
      'AI resume rewrites',
    ],
    cta: 'Start Premium',
    accent: 'green',
    popular: true,
  },
  {
    id: 'recruiter',
    name: 'Recruiter',
    price: '$10',
    cadence: '/month',
    features: [
      'Post unlimited jobs',
      'AI-ranked candidate pipeline',
      'Applicant skill analytics',
      'Team seats & collaboration',
    ],
    cta: 'Start Hiring',
    accent: 'orange',
  },
]

export function PricingPlans() {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [showCoupon, setShowCoupon] = useState<string | null>(null)

  async function handleSelect(plan: Plan) {
    if (plan.id === 'free') {
      router.push(isSignedIn ? '/dashboard' : '/sign-up')
      return
    }

    if (!isSignedIn) {
      router.push('/sign-up')
      return
    }

    // Paid plans are unlocked via coupon (SAFEHAVEN), not checkout.
    setShowCoupon(showCoupon === plan.id ? null : plan.id)
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PLANS.map((plan) => (
        <div
          key={plan.id}
          className={cn(
            'relative flex flex-col rounded-2xl border bg-card p-8',
            plan.popular ? 'border-brand-green shadow-lg' : 'border-border',
          )}
        >
          {plan.popular && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-green px-3 py-1 text-xs font-bold text-brand-green-foreground">
              Most popular
            </span>
          )}
          <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-black text-foreground">
              {plan.price}
            </span>
            <span className="text-muted-foreground">{plan.cadence}</span>
          </div>
          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    plan.accent === 'green'
                      ? 'text-brand-green'
                      : 'text-brand-orange',
                  )}
                  aria-hidden
                />
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => handleSelect(plan)}
            disabled={loading === plan.id}
            className={cn(
              'mt-8 flex h-11 items-center justify-center rounded-lg px-4 text-sm font-bold transition-colors disabled:opacity-60',
              plan.accent === 'green'
                ? 'bg-brand-green text-brand-green-foreground hover:bg-brand-green/90'
                : 'bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90',
            )}
          >
            {loading === plan.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              plan.cta
            )}
          </button>
          {showCoupon === plan.id && plan.id !== 'free' && (
            <div className="mt-4">
              <CouponRedeem />
              <p className="mt-2 text-xs text-muted-foreground">Have a coupon code? Enter it to unlock premium access.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
