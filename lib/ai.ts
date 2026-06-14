import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'

const REGION = process.env.AWS_REGION ?? 'us-east-1'
const MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0'

let bedrockClient: BedrockRuntimeClient | null = null
function getBedrock(): BedrockRuntimeClient {
  if (bedrockClient) return bedrockClient
  bedrockClient = new BedrockRuntimeClient({ region: REGION })
  return bedrockClient
}

async function tryBedrock(prompt: string): Promise<string> {
  const response = await getBedrock().send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    }),
  )
  const result = JSON.parse(new TextDecoder().decode(response.body))
  return result?.content?.[0]?.text
}

async function tryOpenRouter(prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://glaunch.io',
      'X-Title': 'Glaunch',
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct:free',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await response.json()
  return data.choices?.[0]?.message?.content
}

function localFallback(promptType: 'resume' | 'match' | 'questions' | 'score'): string {
  const fallbacks = {
    resume: JSON.stringify({
      atsScore: 61,
      extractedSkills: ['Communication', 'Microsoft Office', 'Teamwork', 'Problem Solving'],
      missingKeywords: ['quantified achievements', 'action verbs', 'measurable results'],
      weakSections: [
        {
          section: 'Work Experience',
          issue: 'Lacks quantified impact',
          fix: "Add numbers — e.g. 'Increased sales by 23%' instead of 'Increased sales'",
        },
      ],
      rewrite: {
        summary: 'Motivated graduate with hands-on experience seeking to contribute to a dynamic team.',
        experience: ['Led cross-functional project delivering results ahead of schedule'],
        skills: ['Data Analysis', 'Project Management', 'Communication'],
      },
      scoreBreakdown: { formatting: 70, keywords: 55, experience: 60, education: 75 },
    }),
    match: JSON.stringify([]),
    questions: JSON.stringify([
      { id: '1', question: 'Tell me about yourself and why you want this role.', type: 'behavioral', tip: 'Use the Present-Past-Future framework.' },
      { id: '2', question: 'Describe a challenge you faced and how you overcame it.', type: 'behavioral', tip: 'Use STAR: Situation, Task, Action, Result.' },
      { id: '3', question: 'Where do you see yourself in 3 years?', type: 'behavioral', tip: "Align your answer with the company's growth." },
      { id: '4', question: 'What is your greatest professional strength?', type: 'behavioral', tip: 'Back it up with a specific example.' },
      { id: '5', question: 'Why should we hire you over other candidates?', type: 'situational', tip: 'Focus on unique value you bring.' },
    ]),
    score: JSON.stringify({
      score: 72,
      feedback: 'Good answer. Add specific examples to strengthen your response.',
      improvedAnswer: 'Consider adding a specific example with a measurable outcome.',
      keyPoints: ['Clear structure', 'Add metrics', 'Mention team impact'],
    }),
  }
  return fallbacks[promptType]
}

export function parseModelJSON<T>(raw: string): T {
  let text = raw.trim()
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const firstBrace = text.search(/[[{]/)
  if (firstBrace > 0) text = text.slice(firstBrace)
  const lastObj = text.lastIndexOf('}')
  const lastArr = text.lastIndexOf(']')
  const end = Math.max(lastObj, lastArr)
  if (end !== -1) text = text.slice(0, end + 1)
  try {
    return JSON.parse(text) as T
  } catch (err) {
    throw new Error('The AI returned a response we could not read.')
  }
}

export async function invokeAI(prompt: string, promptType: 'resume' | 'match' | 'questions' | 'score'): Promise<string> {
  try {
    return await tryBedrock(prompt)
  } catch (e1) {
    console.warn('Bedrock failed, trying OpenRouter:', e1)
    try {
      return await tryOpenRouter(prompt)
    } catch (e2) {
      console.warn('OpenRouter failed, using local fallback:', e2)
      return localFallback(promptType)
    }
  }
}
