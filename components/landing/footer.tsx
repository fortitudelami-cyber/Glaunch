import Link from 'next/link'
import { X, Globe, MessageCircle, Mail } from 'lucide-react'
import { Logo } from '@/components/logo'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Resume AI', href: '/resume' },
      { label: 'Smart Matching', href: '/matches' },
      { label: 'Interview Coach', href: '/interview' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/#features' },
      { label: 'Careers', href: '/#pricing' },
      { label: 'Blog', href: '/#features' },
      { label: 'Contact', href: 'mailto:hello@glaunch.io' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help Center', href: '/#features' },
      { label: 'Community', href: '/#testimonials' },
      { label: 'Privacy', href: '/#pricing' },
      { label: 'Terms', href: '/#pricing' },
    ],
  },
]

const SOCIALS = [
  { label: 'X', icon: X, href: 'https://x.com' },
  { label: 'Website', icon: Globe, href: 'https://glaunch.io' },
  { label: 'WhatsApp', icon: MessageCircle, href: 'https://wa.me/' },
  { label: 'Email', icon: Mail, href: 'mailto:hello@glaunch.io' },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-pretty text-sm text-muted-foreground">
              Your career, launched. AI-powered tools built for students and
              graduates worldwide.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {SOCIALS.map((s) => {
                const Icon = s.icon
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-brand-orange hover:text-brand-orange"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold text-foreground">{col.title}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 Glaunch. Built for students everywhere.
          </p>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <span className="inline-flex h-5 items-center rounded-full bg-foreground px-1.5 font-mono text-[10px] font-bold text-background">
              v0
            </span>
            <span className="text-xs font-medium text-muted-foreground">
            </span>
          </div>
          <p className="font-mono text-sm text-brand-orange">
            Your career, launched.
          </p>
        </div>
      </div>
    </footer>
  )
}
