import { auth } from '@clerk/nextjs/server'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getClient, TABLE_NAME } from '@/lib/dynamodb'
import { invokeModel } from '@/lib/bedrock'
import { fetchJobsForCandidate } from '@/lib/tinyfish'

export const runtime = 'nodejs'

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

async function checkDynamo() {
  try {
    await getClient().send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: 'HEALTH#CHECK', SK: 'HEALTH#CHECK' },
      }),
    )
    return 'ok'
  } catch (error) {
    return `error: ${toMessage(error)}`
  }
}

async function checkBedrock() {
  try {
    const text = await invokeModel('Say OK')
    return text.trim().toUpperCase().includes('OK') ? 'ok' : `ok: ${text}`
  } catch (error) {
    return `error: ${toMessage(error)}`
  }
}

async function checkTinyfish() {
  try {
    if (!process.env.TINYFISH_API_KEY) {
      return 'error: TINYFISH_API_KEY is not configured'
    }

    await fetchJobsForCandidate({
      skills: ['typescript'],
      fieldOfStudy: 'Computer Science',
      graduationYear: '2026',
      country: 'US',
    })

    return 'ok'
  } catch (error) {
    return `error: ${toMessage(error)}`
  }
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [dynamodb, bedrock, tinyfish] = await Promise.all([
    checkDynamo(),
    checkBedrock(),
    checkTinyfish(),
  ])

  return Response.json({
    dynamodb,
    bedrock,
    tinyfish,
    timestamp: new Date().toISOString(),
  })
}
