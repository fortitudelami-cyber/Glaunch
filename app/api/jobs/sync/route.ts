import { getUserId, unauthorized } from '@/lib/api-auth'
import { fetchRemotiveJobs, fetchJobicyJobs } from '@/lib/jobs'
import { getActiveJobs, putJob } from '@/lib/data'
import { putItem } from '@/lib/dynamodb'

export async function POST() {
  const userId = await getUserId()
  if (!userId) return unauthorized()

  const [remotive, jobicy] = await Promise.all([fetchRemotiveJobs(), fetchJobicyJobs()])
  const all = [...remotive, ...jobicy]

  const existing = await getActiveJobs()
  const existingUrls = new Set(existing.map((j) => j.url))

  let synced = 0
  for (const job of all) {
    if (!job.url || existingUrls.has(job.url)) continue
    try {
      // create a jobId-based record
      await putJob({
        jobId: job.pk.replace('JOB#', ''),
        source: 'remotive',
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        description: job.description,
        tags: job.tags,
        isActive: true,
        postedAt: job.postedAt,
      })
      synced++
    } catch (e) {
      console.warn('Failed to put job:', e)
    }
  }

  // record last synced timestamp
  await putItem({ PK: 'SYSTEM#JOBS', SK: 'META', lastSynced: new Date().toISOString() })

  return Response.json({ synced })
}
