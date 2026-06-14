import { v4 as uuidv4 } from 'uuid'
import { getUserId, unauthorized } from '@/lib/api-auth'
import { invokeAI, parseModelJSON } from '@/lib/ai'
import { getUser, getActiveJobs, putMatch } from '@/lib/data'
import { getItem } from '@/lib/dynamodb'
import type { MatchRecord } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

interface RawMatch {
  jobId: string
  matchScore: number
  reasons: string[]
}

export async function POST() {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const user = await getUser(userId)
    const skills: string[] = user?.extractedSkills
      ? safeArray(user.extractedSkills)
      : []

    let jobs = await getActiveJobs()
    // If no jobs or last sync older than 6 hours, trigger a jobs sync
    const meta = await getItem('SYSTEM#JOBS', 'META').catch(() => null)
    const lastSynced = meta?.lastSynced
    const sixHours = 1000 * 60 * 60 * 6
    if (jobs.length === 0 || (lastSynced && Date.now() - new Date(lastSynced).getTime() > sixHours)) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/jobs/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        jobs = await getActiveJobs()
      } catch (e) {
        console.warn('Job sync failed:', e)
      }
    }
    if (jobs.length === 0) {
      return Response.json(
        { error: 'No jobs are available yet. Please try again shortly.' },
        { status: 409 },
      )
    }

    const skillSummary =
      skills.length > 0
        ? skills.join(', ')
        : user?.fieldOfStudy
          ? `Field of study: ${user.fieldOfStudy}. No resume uploaded yet.`
          : 'No resume uploaded yet; infer fit from general entry-level suitability.'

    const jobsForModel = jobs.map((j) => ({
      jobId: j.jobId,
      title: j.title,
      company: j.company,
      description: j.description,
      tags: j.tags,
    }))

    const prompt = `Given this candidate's skills: ${skillSummary}
And these job listings: ${JSON.stringify(jobsForModel)}
Return ONLY valid JSON array of the top 10 matches:
[{"jobId": string, "matchScore": number (0-100), "reasons": [string, string, string]}]
Sort by matchScore descending. Only use jobId values from the listings above.`

    let rawMatches: RawMatch[]
    try {
      const raw = await invokeAI(prompt, 'match')
      rawMatches = parseModelJSON<RawMatch[]>(raw)
    } catch (err) {
      return Response.json({ error: (err as Error).message || 'AI failed' }, { status: 503 })
    }

    const jobMap = new Map(jobs.map((j) => [j.jobId, j]))
    const now = new Date().toISOString()

    const matches: MatchRecord[] = rawMatches
      .filter((m) => jobMap.has(m.jobId))
      .slice(0, 10)
      .map((m) => {
        const job = jobMap.get(m.jobId)!
        return {
          userId,
          matchId: uuidv4(),
          jobId: job.jobId,
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          source: job.source,
          jobUrl: job.url,
          matchScore: clamp(m.matchScore),
          reasons: JSON.stringify((m.reasons ?? []).slice(0, 3)),
          createdAt: now,
        }
      })

    for (const match of matches) {
      await putMatch(match)
    }

    return Response.json({ matches })
  } catch (err) {
    console.log('[v0] generate matches error:', (err as Error).message)
    return Response.json(
      { error: 'Failed to generate matches. Please try again.' },
      { status: 500 },
    )
  }
}

function safeArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}
