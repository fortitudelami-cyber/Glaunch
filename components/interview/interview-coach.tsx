'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Lightbulb,
  CheckCircle2,
  RotateCcw,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type {
  InterviewQuestion,
  InterviewScore,
  MatchRecord,
} from '@/lib/types'

type Stage = 'select' | 'answering' | 'summary'

type ScoredAnswer = {
  answer: string
  score: InterviewScore
}

const typeStyles: Record<string, string> = {
  behavioral: 'bg-brand-green/15 text-brand-green border-brand-green/30',
  technical: 'bg-brand-orange/15 text-brand-orange border-brand-orange/30',
  situational: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
}

export function InterviewCoach({ matches }: { matches: MatchRecord[] }) {
  const [stage, setStage] = useState<Stage>('select')
  const [selectedId, setSelectedId] = useState<string>('')
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [draft, setDraft] = useState('')
  const [showTip, setShowTip] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [results, setResults] = useState<Record<number, ScoredAnswer>>({})
  const [saving, setSaving] = useState(false)

  const selectedMatch = matches.find((m) => m.matchId === selectedId)
  const jobTitle = selectedMatch?.jobTitle ?? ''

  async function startSession() {
    if (!selectedMatch) {
      toast.error('Please pick a role to practice for.')
      return
    }
    setLoadingQuestions(true)
    try {
      const res = await fetch('/api/interview/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: selectedMatch.jobTitle,
          company: selectedMatch.company,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not generate questions.')
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('No questions returned. Please try again.')
      }
      setQuestions(data.questions)
      setStage('answering')
      setCurrent(0)
      setResults({})
      setDraft('')
      setShowTip(false)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoadingQuestions(false)
    }
  }

  async function submitAnswer() {
    const q = questions[current]
    if (!draft.trim()) {
      toast.error('Write an answer before submitting.')
      return
    }
    setScoring(true)
    try {
      const res = await fetch('/api/interview/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, answer: draft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not score answer.')
      setResults((prev) => ({
        ...prev,
        [current]: { answer: draft, score: data.score },
      }))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setScoring(false)
    }
  }

  function nextQuestion() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1)
      setDraft('')
      setShowTip(false)
    } else {
      setStage('summary')
    }
  }

  const overallScore = Math.round(
    (Object.values(results).reduce((sum, r) => sum + r.score.score, 0) /
      Math.max(1, Object.keys(results).length)) ||
      0,
  )

  async function saveSession() {
    setSaving(true)
    try {
      const res = await fetch('/api/interview/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle,
          questions,
          answers: questions.map((_, i) => results[i]?.answer ?? ''),
          scores: questions.map((_, i) => results[i]?.score.score ?? 0),
          feedback: questions.map((_, i) => results[i]?.score.feedback ?? ''),
          overallScore,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save session.')
      toast.success('Session saved to your history.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function practiceAgain() {
    setStage('select')
    setQuestions([])
    setResults({})
    setCurrent(0)
    setDraft('')
    setSelectedId('')
  }

  if (matches.length === 0) {
    return (
      <Card className="border-border/60 bg-card p-10 text-center">
        <div className="mx-auto mb-4 size-8 flex h-8 w-8 items-center justify-center text-brand-orange">•</div>
        <h2 className="text-xl font-bold">No roles to practice yet</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Generate job matches first, then come back to practice role-specific
          interview questions tailored to those positions.
        </p>
        <a
          href="/matches"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-orange px-5 py-2.5 font-semibold text-brand-orange-foreground transition-colors hover:bg-brand-orange/90"
        >
          Find matches
          <ChevronRight className="size-4" />
        </a>
      </Card>
    )
  }

  // ---- SELECT STAGE ----
  if (stage === 'select') {
    return (
      <Card className="border-border/60 bg-card p-6 sm:p-8">
        <h2 className="text-xl font-bold">Choose a role to practice for</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll generate five tailored questions for the position you pick.
        </p>
        <div className="mt-6 max-w-md">
          <Select
            value={selectedId}
            onValueChange={(v) => setSelectedId(v ?? '')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a matched role" />
            </SelectTrigger>
            <SelectContent>
              {matches.map((m) => (
                <SelectItem key={m.matchId} value={m.matchId}>
                  {m.jobTitle} — {m.company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={startSession}
          disabled={loadingQuestions || !selectedId}
          className="mt-6 bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
          size="lg"
        >
          {loadingQuestions ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Generating questions…
            </>
          ) : (
            <>
              Start practice <ChevronRight className="size-4" />
            </>
          )}
        </Button>
      </Card>
    )
  }

  // ---- ANSWERING STAGE ----
  if (stage === 'answering') {
    const q = questions[current]
    const result = results[current]
    const progress = ((current + 1) / questions.length) * 100

    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              Question {current + 1} of {questions.length}
            </span>
            <span className="text-muted-foreground">{jobTitle}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-brand-orange transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card className="border-border/60 bg-card p-6 sm:p-8">
          <Badge
            variant="outline"
            className={cn('mb-4 capitalize', typeStyles[q.type] ?? '')}
          >
            {q.type}
          </Badge>
          <h2 className="text-balance text-xl font-bold leading-snug sm:text-2xl">
            {q.question}
          </h2>

          {q.tip && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowTip((s) => !s)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-orange hover:underline"
              >
                <Lightbulb className="size-4" />
                {showTip ? 'Hide tip' : 'Show tip'}
              </button>
              {showTip && (
                <p className="mt-2 rounded-md border border-brand-orange/20 bg-brand-orange/10 p-3 text-sm text-foreground/90">
                  {q.tip}
                </p>
              )}
            </div>
          )}

          {!result ? (
            <>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your answer here. Be specific and use concrete examples."
                rows={8}
                className="mt-6 resize-none"
                disabled={scoring}
              />
              <Button
                onClick={submitAnswer}
                disabled={scoring}
                className="mt-4 bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
              >
                {scoring ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Scoring…
                  </>
                ) : (
                  'Submit answer'
                )}
              </Button>
            </>
          ) : (
            <AnswerFeedback
              answer={result.answer}
              score={result.score}
              isLast={current === questions.length - 1}
              onNext={nextQuestion}
            />
          )}
        </Card>
      </div>
    )
  }

  // ---- SUMMARY STAGE ----
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/60 bg-card p-6 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-green">
          Session complete
        </p>
        <h2 className="mt-2 text-2xl font-black">Your overall score</h2>
        <div className="mt-4 flex items-center justify-center">
          <span
            className={cn(
              'text-6xl font-black',
              overallScore >= 70
                ? 'text-brand-green'
                : overallScore >= 50
                  ? 'text-brand-orange'
                  : 'text-destructive',
            )}
          >
            {overallScore}
          </span>
          <span className="ml-1 text-2xl font-bold text-muted-foreground">
            /100
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {jobTitle} interview practice
        </p>
      </Card>

      <Card className="border-border/60 bg-card p-6">
        <h3 className="font-bold">Per-question scores</h3>
        <div className="mt-4 flex flex-col gap-4">
          {questions.map((q, i) => {
            const s = results[i]?.score.score ?? 0
            return (
              <div key={q.id ?? i}>
                <div className="flex items-center justify-between text-sm">
                  <span className="line-clamp-1 pr-4 text-foreground/90">
                    {i + 1}. {q.question}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{s}</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      s >= 70
                        ? 'bg-brand-green'
                        : s >= 50
                          ? 'bg-brand-orange'
                          : 'bg-destructive',
                    )}
                    style={{ width: `${s}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={saveSession}
          disabled={saving}
          className="bg-brand-green text-brand-green-foreground hover:bg-brand-green/90"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" /> Save session
            </>
          )}
        </Button>
        <Button onClick={practiceAgain} variant="outline" size="lg">
          <RotateCcw className="size-4" /> Practice again
        </Button>
      </div>
    </div>
  )
}

function AnswerFeedback({
  answer,
  score,
  isLast,
  onNext,
}: {
  answer: string
  score: InterviewScore
  isLast: boolean
  onNext: () => void
}) {
  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-black',
            score.score >= 70
              ? 'bg-brand-green/15 text-brand-green'
              : score.score >= 50
                ? 'bg-brand-orange/15 text-brand-orange'
                : 'bg-destructive/15 text-destructive',
          )}
        >
          {score.score}
        </span>
        <p className="text-sm text-foreground/90">{score.feedback}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-secondary/40 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Your answer
          </h4>
          <p className="whitespace-pre-wrap text-sm text-foreground/80">
            {answer}
          </p>
        </div>
        <div className="rounded-lg border border-brand-green/30 bg-brand-green/5 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-green">
            Improved answer
          </h4>
          <p className="whitespace-pre-wrap text-sm text-foreground/90">
            {score.improvedAnswer}
          </p>
        </div>
      </div>

      {score.keyPoints.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Key points to hit
          </h4>
          <ul className="flex flex-col gap-1.5">
            {score.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-green" />
                <span className="text-foreground/85">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        onClick={onNext}
        className="self-start bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
      >
        {isLast ? 'See summary' : 'Next question'}{' '}
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
