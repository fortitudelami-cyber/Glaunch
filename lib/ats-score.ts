/**
 * Deterministic ATS scorer computed from the actual resume text.
 *
 * This is the standard fallback when the AI provider is unavailable, and a sanity
 * floor otherwise. It produces DIFFERENT, defensible scores for different resumes
 * based on real ATS criteria — never a constant. Scoring rubric (0-100), grouped
 * into the same four buckets the UI renders:
 *
 *   formatting  (0-100): length, sections present, bullet usage, contact block, no red flags
 *   keywords    (0-100): presence of role/skill keywords + hard skills detected
 *   experience  (0-100): action verbs, quantified achievements, dates/tenure
 *   education   (0-100): education section + degree/qualification signals
 *
 * atsScore is a weighted blend of the four.
 */

export interface HeuristicResult {
  atsScore: number
  extractedSkills: string[]
  missingKeywords: string[]
  weakSections: { section: string; issue: string; fix: string }[]
  scoreBreakdown: { formatting: number; keywords: number; experience: number; education: number }
}

const SKILL_DICTIONARY = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'sql', 'nosql',
  'react', 'next.js', 'node', 'node.js', 'vue', 'angular', 'django', 'flask', 'fastapi',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'git',
  'machine learning', 'deep learning', 'nlp', 'pytorch', 'tensorflow', 'pandas', 'numpy',
  'excel', 'power bi', 'tableau', 'figma', 'photoshop', 'communication', 'leadership',
  'project management', 'agile', 'scrum', 'marketing', 'sales', 'accounting', 'finance',
]

const ACTION_VERBS = [
  'led', 'built', 'designed', 'developed', 'implemented', 'created', 'launched', 'managed',
  'improved', 'increased', 'reduced', 'delivered', 'optimized', 'automated', 'shipped',
  'analyzed', 'drove', 'owned', 'scaled', 'coordinated', 'achieved', 'spearheaded',
]

const SECTION_HINTS = {
  experience: /\b(experience|employment|work history|professional)\b/i,
  education: /\b(education|degree|university|college|b\.?sc|m\.?sc|bachelor|master|phd)\b/i,
  skills: /\b(skills|technologies|competencies|proficienc)\b/i,
  summary: /\b(summary|objective|profile|about)\b/i,
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function computeAtsScore(rawText: string): HeuristicResult {
  const text = rawText.replace(/\r/g, '')
  const lower = text.toLowerCase()
  const words = lower.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  // --- keywords / skills ---
  const found = new Set<string>()
  for (const skill of SKILL_DICTIONARY) {
    if (lower.includes(skill)) found.add(skill)
  }
  const extractedSkills = [...found].map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase()))
  // keyword score scales with distinct skills, saturating around 12
  const keywords = clamp((found.size / 12) * 100)

  // --- experience: action verbs + quantified achievements + dates ---
  const verbHits = ACTION_VERBS.filter((v) => new RegExp(`\\b${v}\\b`, 'i').test(text)).length
  const quantified = (text.match(/\b\d+([.,]\d+)?\s?(%|percent|k|m|\+|x)\b/gi) || []).length
  const hasDates = /\b(19|20)\d{2}\b/.test(text)
  const experience = clamp(
    (Math.min(verbHits, 8) / 8) * 45 +
    (Math.min(quantified, 5) / 5) * 40 +
    (hasDates ? 15 : 0),
  )

  // --- education ---
  const eduPresent = SECTION_HINTS.education.test(text)
  const education = clamp(eduPresent ? 80 + (/(phd|master|m\.?sc)/i.test(text) ? 20 : 0) : 30)

  // --- formatting: length, sections, bullets, contact ---
  const sectionsPresent = Object.values(SECTION_HINTS).filter((re) => re.test(text)).length
  const hasBullets = /(^|\n)\s*[•\-\*]/.test(text)
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(text)
  const lengthOk = wordCount >= 200 && wordCount <= 1200
  const tooShort = wordCount < 120
  const formatting = clamp(
    (sectionsPresent / 4) * 40 +
    (hasBullets ? 20 : 0) +
    (hasEmail ? 12 : 0) +
    (hasPhone ? 8 : 0) +
    (lengthOk ? 20 : tooShort ? 0 : 10),
  )

  // --- weighted overall ---
  const atsScore = clamp(
    formatting * 0.25 + keywords * 0.3 + experience * 0.3 + education * 0.15,
  )

  // --- weak sections + missing keywords (actionable, specific) ---
  const weakSections: HeuristicResult['weakSections'] = []
  if (!SECTION_HINTS.summary.test(text))
    weakSections.push({ section: 'Summary', issue: 'No professional summary detected.', fix: 'Add a 2-3 line summary with your target role and top strengths.' })
  if (quantified < 2)
    weakSections.push({ section: 'Experience', issue: 'Few or no quantified achievements.', fix: 'Add numbers: "increased X by 30%", "handled 50+ tickets/week".' })
  if (verbHits < 3)
    weakSections.push({ section: 'Experience', issue: 'Weak action verbs.', fix: 'Start bullets with verbs like Led, Built, Delivered, Reduced.' })
  if (!eduPresent)
    weakSections.push({ section: 'Education', issue: 'No education section detected.', fix: 'Add your degree, institution, and graduation year.' })
  if (!hasEmail || !hasPhone)
    weakSections.push({ section: 'Contact', issue: 'Missing email or phone.', fix: 'Add a clear contact block at the top (email + phone + location).' })
  if (!lengthOk)
    weakSections.push({ section: 'Length', issue: tooShort ? 'Resume is very short.' : 'Resume may be too long.', fix: 'Aim for ~1 page (200-600 words) for early-career roles.' })

  const importantSkills = ['communication', 'leadership', 'project management']
  const missingKeywords = importantSkills.filter((s) => !lower.includes(s)).map((s) => `Consider adding: ${s}`)

  return {
    atsScore,
    extractedSkills,
    missingKeywords,
    weakSections,
    scoreBreakdown: { formatting, keywords, experience, education },
  }
}
