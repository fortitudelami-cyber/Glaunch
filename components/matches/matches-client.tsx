'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MapPin,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MatchRecord } from '@/lib/types'

type Match = Omit<MatchRecord, 'reasons'> & { reasons: string[] }

const FILTERS = [
  { label: 'All', min: 0 },
  { label: '>80% Match', min: 80 },
  { label: '>60% Match', min: 60 },
] as const

function parseMatch(m: MatchRecord): Match {
  let reasons: string[] = []
  try {
    reasons = JSON.parse(m.reasons)
  } catch {
    reasons = []
  }
  return { ...m, reasons }
}

export function MatchesClient({
  initialMatches,
  appliedJobIds,
}: {
  initialMatches: MatchRecord[]
  appliedJobIds: string[]
}) {
  const [matches, setMatches] = useState<Match[]>(
    initialMatches.map(parseMatch),
  )
  const [filter, setFilter] = useState(0)
  const [loading, setLoading] = useState(false)
  const [applied, setApplied] = useState<Set<string>>(new Set(appliedJobIds))
  const [applyingId, setApplyingId] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/matches/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not generate matches')
      setMatches((data.matches as MatchRecord[]).map(parseMatch))
      toast.success('Matches refreshed.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load matches')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-generate on first load when there are no stored matches.
  useEffect(() => {
    if (initialMatches.length === 0) {
      generate()
    }
  }, [initialMatches.length, generate])

  async function autoApply(m: Match) {
    setApplyingId(m.jobId)
    try {
      window.open(m.jobUrl, '_blank', 'noopener,noreferrer')
      const res = await fetch(`/api/apply/${encodeURIComponent(m.jobId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: m.jobTitle,
          company: m.company,
          jobUrl: m.jobUrl,
          source: m.source,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save application')
      setApplied((prev) => new Set(prev).add(m.jobId))
      toast.success('Job opened in new tab. Mark as applied when done.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply')
    } finally {
      setApplyingId(null)
    }
  }

  const visible = matches.filter((m) => m.matchScore >= FILTERS[filter].min)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {FILTERS.map((f, i) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setFilter(i)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                filter === i
                  ? 'bg-brand-orange text-brand-orange-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand-orange disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh matches
        </button>
      </div>

      {loading && matches.length === 0 ? (
        <MatchSkeletons />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="mx-auto mb-2 h-8 w-8 text-brand-orange flex items-center justify-center">•</div>
          <p className="mt-3 font-semibold">No matches at this threshold</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a lower filter or refresh to generate new matches.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {visible.map((m) => {
            const isApplied = applied.has(m.jobId)
            return (
              <div
                key={m.matchId}
                className="flex flex-col rounded-2xl border border-border bg-card p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {m.source}
                    </span>
                    <h3 className="mt-3 text-lg font-bold">{m.jobTitle}</h3>
                    <p className="font-medium text-muted-foreground">
                      {m.company}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {m.location}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-xl bg-brand-green/15 px-3 py-2 text-lg font-black text-brand-green">
                    {m.matchScore}%
                  </span>
                </div>

                {m.reasons.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2">
                    {m.reasons.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-5 flex items-center gap-2">
                  {isApplied ? (
                    <span className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-green/15 text-sm font-semibold text-brand-green">
                      <Check className="h-4 w-4" />
                      Applied
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => autoApply(m)}
                      disabled={applyingId === m.jobId}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-orange text-sm font-semibold text-brand-orange-foreground transition-colors hover:bg-brand-orange/90 disabled:opacity-50"
                    >
                      {applyingId === m.jobId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Auto-Apply'
                      )}
                    </button>
                  )}
                  <a
                    href={m.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-4 text-sm font-semibold transition-colors hover:border-brand-orange"
                  >
                    View Job
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MatchSkeletons() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-56 animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </div>
  )
}
