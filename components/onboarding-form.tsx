'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Briefcase, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { COUNTRIES } from '@/lib/countries'
import UniversitySelect from '@/components/UniversitySelect'
import { cn } from '@/lib/utils'

type Role = 'student' | 'recruiter'

const CURRENT_YEAR = new Date().getFullYear()
const GRAD_YEARS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - 4 + i)
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+']

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function OnboardingForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string
  defaultEmail: string
}) {
  const router = useRouter()
  const [role, setRole] = useState<Role>('student')
  const [loading, setLoading] = useState(false)

  // Shared
  const [fullName, setFullName] = useState(defaultName)
  const [country, setCountry] = useState('')

  // Student
  const [university, setUniversity] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [fieldOfStudy, setFieldOfStudy] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)

  // Recruiter
  const [company, setCompany] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [hiringRoles, setHiringRoles] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !country) {
      toast.error('Please fill in your name and country.')
      return
    }
    if (role === 'student' && (!university.trim() || !graduationYear || !fieldOfStudy.trim())) {
      toast.error('Please complete your education details.')
      return
    }
    if (role === 'recruiter' && (!company.trim() || !companySize)) {
      toast.error('Please complete your company details.')
      return
    }

    setLoading(true)
    try {
      let resumeText = ''
      if (role === 'student' && cvFile) {
        const valid = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if (!valid.includes(cvFile.type)) {
          toast.error('CV must be a PDF or DOCX file.')
          setLoading(false)
          return
        }
        resumeText = await fileToBase64(cvFile)
      }

      const payload =
        role === 'student'
          ? {
              role,
              fullName,
              email: defaultEmail,
              country,
              university,
              graduationYear,
              fieldOfStudy,
              resumeText,
              cvFileName: cvFile?.name,
              profileComplete: 50,
            }
          : {
              role,
              fullName,
              email: defaultEmail,
              country,
              university: '',
              fieldOfStudy: hiringRoles,
              company,
              companySize,
              profileComplete: 50,
            }

      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not save your profile')
      }
      toast.success('Profile saved. Welcome to Glaunch.')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const inputClass =
    'h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-brand-orange'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRole('student')}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors',
            role === 'student'
              ? 'border-brand-orange bg-brand-orange/10'
              : 'border-border bg-card hover:border-muted-foreground',
          )}
        >
          <GraduationCap
            className={cn(
              'h-7 w-7',
              role === 'student' ? 'text-brand-orange' : 'text-muted-foreground',
            )}
          />
          <span className="font-bold">Student</span>
        </button>
        <button
          type="button"
          onClick={() => setRole('recruiter')}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors',
            role === 'recruiter'
              ? 'border-brand-orange bg-brand-orange/10'
              : 'border-border bg-card hover:border-muted-foreground',
          )}
        >
          <Briefcase
            className={cn(
              'h-7 w-7',
              role === 'recruiter' ? 'text-brand-orange' : 'text-muted-foreground',
            )}
          />
          <span className="font-bold">Recruiter</span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="fullName">
          Full name
        </label>
        <input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
          placeholder="Amara Okafor"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="country">
          Country
        </label>
        <select
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={inputClass}
        >
          <option value="">Select your country</option>
                {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {role === 'student' ? (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="university">
              University
            </label>
            <UniversitySelect id="university" value={university} onChange={setUniversity} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="gradYear">
                Graduation year
              </label>
              <select
                id="gradYear"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className={inputClass}
              >
                <option value="">Select year</option>
                {GRAD_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="field">
                Field of study
              </label>
              <input
                id="field"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                className={inputClass}
                placeholder="Computer Science"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">CV (optional, PDF or DOCX)</label>
            <label
              htmlFor="cv"
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-4 text-sm text-muted-foreground hover:border-brand-orange"
            >
              <Upload className="h-5 w-5" />
              {cvFile ? cvFile.name : 'Click to upload your CV'}
              <input
                id="cv"
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="company">
              Company name
            </label>
            <input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputClass}
              placeholder="Paystack"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="size">
              Company size
            </label>
            <select
              id="size"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className={inputClass}
            >
              <option value="">Select size</option>
              {COMPANY_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} employees
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="roles">
              Roles you&apos;re hiring for
            </label>
            <textarea
              id="roles"
              value={hiringRoles}
              onChange={(e) => setHiringRoles(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand-orange"
              placeholder="Frontend Engineer, Data Analyst, Product Designer..."
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 items-center justify-center rounded-lg bg-brand-orange px-4 font-bold text-brand-orange-foreground transition-colors hover:bg-brand-orange/90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue to dashboard'}
      </button>
    </form>
  )
}
