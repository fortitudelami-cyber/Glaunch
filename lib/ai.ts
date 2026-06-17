import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'
import { fromEnv } from '@aws-sdk/credential-providers'

function getBedrockClient() {
  const config: { region: string; credentials?: ReturnType<typeof fromEnv> } = {
    region: process.env.AWS_REGION ?? 'us-east-1',
  }

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = fromEnv()
  }

  return new BedrockRuntimeClient(config)
}

export async function tryBedrock(prompt: string): Promise<string> {
  const client = getBedrockClient()
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  }

  const response = await client.send(
    new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    }),
  )

  const decoded = JSON.parse(new TextDecoder().decode(response.body))
  return decoded.content?.[0]?.text ?? ''
}

export * from './bedrock'
