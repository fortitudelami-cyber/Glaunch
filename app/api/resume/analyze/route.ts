import { v4 as uuidv4 } from 'uuid'
import { getAuthedUser, unauthorized } from '@/lib/api-auth'
import { invokeAI, parseModelJSON } from '@/lib/ai'
import { putResume, updateUser, getUser, putUser } from '@/lib/data'
import type { ResumeAnalysis, ResumeRecord, UserRecord } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM =
  'You are an expert resume analyst for student and graduate job seekers worldwide.'

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const name = file.name.toLowerCase()

  if (name.endsWith('.pdf')) {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    return result.text
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  throw new Error('Unsupported file type. Upload a PDF or DOCX.')
}

export async function POST(req: Request) {
  try {
    const authed = await getAuthedUser()
    if (!authed) return unauthorized()

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return Response.json({ error: 'No file uploaded.' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      return Response.json(
        { error: 'Only PDF and DOCX files are supported.' },
        { status: 400 },
      )
    }

    let rawText: string
    try {
      rawText = (await extractText(file)).trim()
    } catch (err) {
      return Response.json(
        { error: (err as Error).message || 'Could not read the file.' },
        { status: 400 },
      )
    }

    if (rawText.length < 40) {
      return Response.json(
        {
          error:
            'We could not extract enough text from this file. Try a text-based PDF or a DOCX export.',
        },
        { status: 400 },
      )
    }

    const prompt = `Analyze this resume. Return ONLY valid JSON, no markdown:
{
  "atsScore": number,
  "extractedSkills": string[],
  "missingKeywords": string[],
  "weakSections": [{"section": string, "issue": string, "fix": string}],
  "rewrite": {"summary": string, "experience": string[], "skills": string[]},
  "scoreBreakdown": {"formatting": number, "keywords": number, "experience": number, "education": number}
}
Resume text: ${rawText.slice(0, 12000)}`

    let analysis: ResumeAnalysis
    try {
      const raw = await invokeAI(prompt, 'resume')
      analysis = parseModelJSON<ResumeAnalysis>(raw)
    } catch (err) {
      return Response.json({ error: (err as Error).message || 'AI failed' }, { status: 503 })
    }

    const resumeId = uuidv4()
    const resume: ResumeRecord = {
      userId: authed.userId,
      resumeId,
      fileName: file.name,
      rawText,
      extractedSkills: JSON.stringify(analysis.extractedSkills ?? []),
      atsScore: analysis.atsScore ?? 0,
      aiRewriteSummary: analysis.rewrite?.summary ?? '',
      aiRewriteExperience: JSON.stringify(analysis.rewrite?.experience ?? []),
      aiRewriteSkills: JSON.stringify(analysis.rewrite?.skills ?? []),
      scoreBreakdown: JSON.stringify(analysis.scoreBreakdown ?? {}),
      missingKeywords: JSON.stringify(analysis.missingKeywords ?? []),
      weakSections: JSON.stringify(analysis.weakSections ?? []),
      uploadedAt: new Date().toISOString(),
    }
    await putResume(resume)

    // Update the user's ATS score, stored resume text and skills.
    const existing = await getUser(authed.userId)
    if (existing) {
      await updateUser(authed.userId, {
        atsScore: analysis.atsScore ?? 0,
        resumeText: rawText,
        extractedSkills: JSON.stringify(analysis.extractedSkills ?? []),
        profileComplete: Math.max(existing.profileComplete ?? 0, 75),
      })
    } else {
      const fresh: UserRecord = {
        userId: authed.userId,
        email: authed.email,
        fullName: authed.fullName || 'New User',
        country: '',
        role: 'student',
        plan: 'free',
        atsScore: analysis.atsScore ?? 0,
        profileComplete: 75,
        resumeText: rawText,
        extractedSkills: JSON.stringify(analysis.extractedSkills ?? []),
        createdAt: new Date().toISOString(),
      }
      await putUser(fresh)
    }

    return Response.json({ analysis, resumeId })
  } catch (err) {
    console.log('[v0] resume analyze error:', (err as Error).message)
    return Response.json(
      { error: 'Failed to analyze resume. Please try again.' },
      { status: 500 },
    )
  }
}
