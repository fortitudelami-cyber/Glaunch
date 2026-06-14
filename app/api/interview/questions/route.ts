import { v4 as uuidv4 } from 'uuid'
import { getUserId, unauthorized } from '@/lib/api-auth'
import { invokeAI, parseModelJSON } from '@/lib/ai'
import type { InterviewQuestion } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const body = (await req.json()) as {
      jobTitle?: string
      description?: string
    }
    const jobTitle = (body.jobTitle ?? '').trim()
    if (!jobTitle) {
      return Response.json({ error: 'A job title is required.' }, { status: 400 })
    }

    const prompt = `Generate 5 interview questions for a ${jobTitle} role at a modern tech company.${
      body.description ? ` Role context: ${body.description.slice(0, 1500)}` : ''
    } Mix behavioral and technical. Return ONLY valid JSON array:
[{"id": string, "question": string, "type": "behavioral"|"technical"|"situational", "tip": string}]`

    let questions: InterviewQuestion[]
    try {
      const raw = await invokeAI(prompt, 'questions')
      questions = parseModelJSON<InterviewQuestion[]>(raw)
    } catch (err) {
      return Response.json({ error: (err as Error).message || 'AI failed' }, { status: 503 })
    }

    // Ensure every question has a stable id.
    const normalized = questions.slice(0, 5).map((q) => ({
      id: q.id || uuidv4(),
      question: q.question,
      type: ['behavioral', 'technical', 'situational'].includes(q.type)
        ? q.type
        : 'behavioral',
      tip: q.tip ?? '',
    }))

    return Response.json({ questions: normalized })
  } catch (err) {
    console.log('[v0] interview questions error:', (err as Error).message)
    return Response.json(
      { error: 'Failed to generate questions. Please try again.' },
      { status: 500 },
    )
  }
}
