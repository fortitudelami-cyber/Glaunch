'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Ticket, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function CouponRedeem({ className }: { className?: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function redeem() {
    if (!code.trim()) {
      toast.error('Enter a coupon code.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not redeem coupon.')
        return
      }
      setDone(true)
      toast.success('Premium unlocked!')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className={cn('flex items-center gap-2 rounded-lg border border-brand-green bg-brand-green/10 p-4 text-sm font-medium', className)}>
        <Check className="h-4 w-4 text-brand-green" aria-hidden />
        Premium unlocked. Enjoy full access.
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row', className)}>
      <div className="relative flex-1">
        <Ticket className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && redeem()}
          placeholder="Enter coupon code"
          className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-brand-green"
          autoCapitalize="characters"
        />
      </div>
      <button
        type="button"
        onClick={redeem}
        disabled={loading}
        className="flex h-11 items-center justify-center rounded-lg bg-brand-green px-5 text-sm font-bold text-brand-green-foreground transition-colors hover:bg-brand-green/90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock Premium'}
      </button>
    </div>
  )
}
