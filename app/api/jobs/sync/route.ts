import { v4 as uuidv4 } from 'uuid'
import { auth } from '@clerk/nextjs/server'
import { putJob } from '@/lib/data'
import { getItem, JOB_GSI1PK, keys, queryGSI } from '@/lib/dynamodb'
import { fetchJobsForCandidate } from '@/lib/tinyfish'
import type { JobRecord } from '@/lib/types'

export const runtime = 'nodejs'

const DEFAULT_SOURCES = ['tinyfish', 'remotive', 'jobicy']

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags.filter((tag): tag is string => typeof tag === 'string')
}

function makeJobRecord(input: {
  jobId: string
  source: string
  title: string
  company: string
  location: string
  url: string
  description: string
  tags: string[]
}): JobRecord {
  const now = new Date().toISOString()
  return {
    jobId: input.jobId,
    source: input.source,
    title: input.title,
    company: input.company,
    location: input.location,
    url: input.url,
    description: input.description,
    tags: input.tags,
    sector: input.tags[0] ?? 'General',
    postedAt: now,
    isActive: true,
  }
}

async function fetchRemotiveJobs() {
  const response = await fetch(
    'https://remotive.com/api/remote-jobs?limit=10',
    { headers: { Accept: 'application/json' } },
  )
  if (!response.ok) {
    return []
  }
  const data = await response.json()
  const jobs = Array.isArray(data?.jobs) ? data.jobs : []
  return jobs
    .filter((job: any) => job?.url && job?.title)
    .map((job: any) => ({
      title: job.title,
      company: job.company_name ?? 'Unknown company',
      location: job.candidate_required_location || 'Remote',
      url: job.url,
      description: job.description || '',
      tags: normalizeTags(job.tags),
      source: 'remotive',
    }))
}

async function fetchJobicyJobs() {
  const response = await fetch('https://jobicy.com/api/v2/remote-jobs', {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    return []
  }
  const data = await response.json()
  const jobs = Array.isArray(data?.jobs) ? data.jobs : []
  return jobs
    .filter((job: any) => job?.url && job?.jobTitle)
    .map((job: any) => ({
      title: job.jobTitle,
      company: job.companyName || 'Unknown company',
      location: job.jobLocation || 'Remote',
      url: job.url,
      description: job.jobDescription || '',
      tags: normalizeTags(job.tags),
      source: 'jobicy',
    }))
}

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getItem<Record<string, unknown>>(
      keys.userPk(userId),
      keys.userProfileSk(),
    )

    if (!profile) {
      return Response.json(
        { error: 'User profile not found. Complete onboarding first.' },
        { status: 404 },
      )
    }

    const skills = (() => {
      try {
        const parsed = JSON.parse(String(profile.extractedSkills || '[]'))
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })()

    const tinyfishJobs = await fetchJobsForCandidate({
      skills,
      fieldOfStudy: String(profile.fieldOfStudy || ''),
      graduationYear: String(profile.graduationYear || ''),
      country: String(profile.country || ''),
    })

    const [remotiveJobs, jobicyJobs, existingJobs] = await Promise.all([
      fetchRemotiveJobs(),
      fetchJobicyJobs(),
      queryGSI<JobRecord>(JOB_GSI1PK),
    ])

    const existingUrls = new Set(existingJobs.map((job) => job.url))
    const allJobs = [...tinyfishJobs, ...remotiveJobs, ...jobicyJobs]
    const uniqueJobs = Array.from(
      new Map(allJobs.map((job) => [job.url, job])).values(),
    )

    const stored: string[] = []
    for (const job of uniqueJobs) {
      if (existingUrls.has(job.url) || stored.includes(job.url)) {
        continue
      }

      const jobId = uuidv4()
      const payload = makeJobRecord({
        jobId,
        source: job.source,
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        description: job.description,
        tags: job.tags,
      })

      await putJob(payload)
      stored.push(job.url)
      existingUrls.add(job.url)
    }

    return Response.json({
      synced: stored.length,
      source: DEFAULT_SOURCES.join('+'),
    })
  } catch (error) {
    console.error('[v0] jobs sync error:', error)
    return Response.json(
      { error: 'Failed to sync jobs. Please try again.' },
      { status: 500 },
    )
  }
}
