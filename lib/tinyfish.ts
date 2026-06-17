type CandidateProfile = {
  skills: string[]
  fieldOfStudy: string
  graduationYear: string
  country: string
}

type TinyfishJob = {
  title: string
  company: string
  location: string
  url: string
  description: string
  tags: string[]
  source: string
}

const TINYFISH_API_URL = 'https://api.tinyfish.ai/v1/agent/run'
const TINYFISH_RESULT_URL = 'https://api.tinyfish.ai/v1/agent/result'

function normalizeJobs(raw: unknown): TinyfishJob[] {
  if (!Array.isArray(raw)) return []

  return raw.filter((item): item is TinyfishJob => {
    if (!item || typeof item !== 'object') return false
    const candidate = item as Record<string, unknown>
    return (
      typeof candidate.title === 'string' &&
      typeof candidate.company === 'string' &&
      typeof candidate.location === 'string' &&
      typeof candidate.url === 'string' &&
      typeof candidate.description === 'string'
    )
  })
}

export async function fetchJobsForCandidate(
  profile: CandidateProfile,
): Promise<TinyfishJob[]> {
  const query = `
    Find entry-level jobs and internships for a student with these skills: ${profile.skills.join(', ')}.
    Field of study: ${profile.fieldOfStudy}.
    Graduating: ${profile.graduationYear}.
    Country: ${profile.country}.
    Looking for remote or international opportunities.
    Search these sites:
      - jobs.80000hours.org
      - probablygood.org/job-board
      - wellfound.com/jobs
      - remotive.com
      - idealist.org
      - handshake.com/jobs
      - workatastartup.com
    Return results as JSON array:
    [{
      title: string,
      company: string,
      location: string,
      url: string,
      description: string,
      tags: string[],
      source: string
    }]
    Only return roles relevant to the candidate's skills and study field.
    Limit to 20 best matches.
  `

  const response = await fetch(TINYFISH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TINYFISH_API_KEY}`,
    },
    body: JSON.stringify({
      task: query,
      output_format: 'json',
    }),
  })

  if (!response.ok) {
    throw new Error(`Tinyfish failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (data?.status === 'pending' && data?.taskId) {
    return await pollTinyfishResult(data.taskId)
  }

  if (Array.isArray(data?.result)) {
    return normalizeJobs(data.result)
  }

  if (Array.isArray(data?.jobs)) {
    return normalizeJobs(data.jobs)
  }

  if (Array.isArray(data)) {
    return normalizeJobs(data)
  }

  return []
}

async function pollTinyfishResult(
  taskId: string,
  maxAttempts = 30,
): Promise<TinyfishJob[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const resultResponse = await fetch(`${TINYFISH_RESULT_URL}/${taskId}`, {
      headers: {
        Authorization: `Bearer ${process.env.TINYFISH_API_KEY}`,
      },
    })

    if (!resultResponse.ok) {
      throw new Error(
        `Tinyfish result fetch failed: ${resultResponse.status} ${resultResponse.statusText}`,
      )
    }

    const data = await resultResponse.json()

    if (data?.status === 'completed') {
      return normalizeJobs(data.result)
    }

    if (data?.status === 'failed') {
      throw new Error('Tinyfish task failed')
    }
  }

  throw new Error('Tinyfish timed out')
}
