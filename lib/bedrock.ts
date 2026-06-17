import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'
import { fromEnv } from '@aws-sdk/credential-providers'

const REGION = process.env.AWS_REGION ?? 'us-east-1'
const MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0'

let client: BedrockRuntimeClient | null = null

function getBedrock(): BedrockRuntimeClient {
  if (client) return client

  const config: { region: string; credentials?: ReturnType<typeof fromEnv> } = {
    region: REGION,
  }

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = fromEnv()
  }

  client = new BedrockRuntimeClient(config)
  return client
}

export class BedrockUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BedrockUnavailableError'
  }
}

/**
 * Invoke Claude 3 Sonnet on Amazon Bedrock and return the raw text completion.
 * Throws BedrockUnavailableError on any failure so callers can degrade gracefully.
 */
export async function invokeModel(
  prompt: string,
  system?: string,
  maxTokens = 2048,
): Promise<string> {
  try {
    const body = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      temperature: 0.4,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    }

    const response = await getBedrock().send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body),
      }),
    )

    const decoded = JSON.parse(new TextDecoder().decode(response.body))
    const text: string | undefined = decoded?.content?.[0]?.text
    if (!text) {
      throw new BedrockUnavailableError('Empty response from Bedrock model.')
    }
    return text
  } catch (err) {
    console.log('[v0] Bedrock invoke failed:', (err as Error).message)
    if (err instanceof BedrockUnavailableError) throw err
    throw new BedrockUnavailableError(
      'The AI service is temporarily unavailable. Please try again in a moment.',
    )
  }
}

/**
 * Parse a JSON object/array out of a model completion, stripping markdown fences
 * and any leading/trailing prose the model may add.
 */
export function parseModelJSON<T>(raw: string): T {
  let text = raw.trim()

  // strip ```json ... ``` fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

  // grab the first {...} or [...] block
  const firstBrace = text.search(/[[{]/)
  if (firstBrace > 0) text = text.slice(firstBrace)

  const lastObj = text.lastIndexOf('}')
  const lastArr = text.lastIndexOf(']')
  const end = Math.max(lastObj, lastArr)
  if (end !== -1) text = text.slice(0, end + 1)

  try {
    return JSON.parse(text) as T
  } catch {
    throw new BedrockUnavailableError(
      'The AI returned a response we could not read. Please try again.',
    )
  }
}
