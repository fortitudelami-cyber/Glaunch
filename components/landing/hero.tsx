'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ROLES = [
  'Frontend Engineer',
  'Data Analyst',
  'Product Designer',
  'UX Researcher',
  'Software Engineer',
]

function useTypewriter(words: string[]) {
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = words[index % words.length]
    const done = !deleting && text === current
    const cleared = deleting && text === ''

    const delay = done ? 1600 : cleared ? 300 : deleting ? 45 : 85

    const timer = setTimeout(() => {
      if (done) {
        setDeleting(true)
        return
      }
      if (cleared) {
        setDeleting(false)
        setIndex((i) => (i + 1) % words.length)
        return
      }
      setText((prev) =>
        deleting
          ? current.slice(0, prev.length - 1)
          : current.slice(0, prev.length + 1),
      )
    }, delay)

    return () => clearTimeout(timer)
  }, [text, deleting, index, words])

  return text
}

export function Hero() {
  const typed = useTypewriter(ROLES)

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(232,93,39,0.16),transparent_70%)]"
      />
      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-4 py-1.5 text-sm text-brand-orange">
          <Sparkles className="size-3.5" />
          AI-powered career launchpad for students worldwide
        </span>

        <h1 className="mt-7 text-pretty text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Land Your First Job, Anywhere in the World
        </h1>

        <p className="mt-6 text-xl font-semibold sm:text-2xl">
          <span className="text-muted-foreground">Get hired as a </span>
          <span className="text-brand-orange">{typed}</span>
          <span className="ml-0.5 inline-block w-0.5 animate-pulse bg-brand-orange align-middle">
            &nbsp;
          </span>
        </p>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Glaunch reads your resume, scores it like a real ATS, matches you to
          internships and entry-level roles, and coaches you through interviews —
          all powered by AI built for students and graduates everywhere.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-12 px-6 text-base bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90',
            )}
          >
            Get Started Free
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#features"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'lg' }),
              'h-12 px-6 text-base',
            )}
          >
            See how it works
          </a>
        </div>

        <p className="mt-7 text-sm text-muted-foreground">
          Free forever for students · No credit card required · 54 countries
        </p>
      </div>
    </section>
  )
}
