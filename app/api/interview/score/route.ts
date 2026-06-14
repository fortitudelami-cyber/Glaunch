import { getUserId, unauthorized } from '@/lib/api-auth'
import { invokeAI, parseModelJSON } from '@/lib/ai'
import type { InterviewScore } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const userId = await getUserId()
    if (!userId) return unauthorized()

    const body = (await req.json()) as { question?: string; answer?: string }
    const question = (body.question ?? '').trim()
    const answer = (body.answer ?? '').trim()

    if (!question || !answer) {
      return Response.json(
        { error: 'Both a question and an answer are required.' },
        { status: 400 },
      )
    }

    const prompt = `Score this interview answer. Return ONLY valid JSON:
{"score": number (0-100), "feedback": string, "improvedAnswer": string, "keyPoints": string[]}
Question: ${question}
Answer: ${answer.slice(0, 4000)}`

    let result: InterviewScore
    try {
      const raw = await invokeAI(prompt, 'score')
      result = parseModelJSON<InterviewScore>(raw)
    } catch (err) {
      return Response.json({ error: (err as Error).message || 'AI failed' }, { status: 503 })
    }

    return Response.json({
      score: {
        score: Math.max(0, Math.min(100, Math.round(result.score ?? 0))),
        feedback: result.feedback ?? '',
        improvedAnswer: result.improvedAnswer ?? '',
        keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
      },
    })
  } catch (err) {
    console.log('[v0] interview score error:', (err as Error).message)
    return Response.json(
      { error: 'Failed to score answer. Please try again.' },
      { status: 500 },
    )
  }
}
