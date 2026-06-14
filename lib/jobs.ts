export async function fetchRemotiveJobs() {
  const categories = ['software-dev', 'data', 'product', 'design', 'marketing']
  const results: any[] = []
  for (const cat of categories) {
    try {
      const res = await fetch(`https://remotive.com/api/remote-jobs?category=${cat}&limit=10`)
      const data = await res.json()
      results.push(
        ...(data.jobs || []).map((j: any) => ({
          pk: `JOB#${crypto.randomUUID()}`,
          sk: `SOURCE#remotive`,
          GSI1PK: 'JOB',
          GSI1SK: j.publication_date ?? new Date().toISOString(),
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location ?? 'Remote',
          url: j.url,
          description: (j.description || '').replace(/<[^>]*>/g, '').slice(0, 500),
          tags: j.tags || [],
          isActive: true,
          postedAt: j.publication_date ?? new Date().toISOString(),
        })),
      )
    } catch (e) {
      console.warn(`Remotive fetch failed for ${cat}:`, e)
    }
  }
  return results
}

export async function fetchJobicyJobs() {
  try {
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?count=20&industry=tech')
    const data = await res.json()
    return (data.jobs || []).map((j: any) => ({
      pk: `JOB#${crypto.randomUUID()}`,
      sk: `SOURCE#jobicy`,
      GSI1PK: 'JOB',
      GSI1SK: j.pubDate ?? new Date().toISOString(),
      title: j.jobTitle,
      company: j.companyName,
      location: j.jobGeo ?? 'Remote',
      url: j.url,
      description: j.jobExcerpt?.slice(0, 500),
      tags: j.jobType ? [j.jobType] : [],
      isActive: true,
      postedAt: j.pubDate ?? new Date().toISOString(),
    }))
  } catch (e) {
    console.warn('Jobicy fetch failed:', e)
    return []
  }
}
