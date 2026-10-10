import { starterUrl } from '@/lib/offers'

// The BLE Starter logo mark: a dot with two signal arcs.
export function StarterMark({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="8" cy="20" r="2.5" fill="currentColor" />
      <path d="M8 12.5a7.5 7.5 0 0 1 7.5 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 6a14 14 0 0 1 14 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// Primary "Join the founding list" button plus a "See what's inside" link, both tracked.
export function StarterLinks({ content, term }: { content: string; term: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <a
        href={starterUrl(content, term, 'join')}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-cyan-500/20"
      >
        Join the founding list
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </a>
      <a
        href={starterUrl(content, term, 'inside')}
        target="_blank"
        rel="noopener"
        className="text-sm font-medium text-cyan-300 hover:text-cyan-200 underline-offset-4 hover:underline transition-colors"
      >
        See what&apos;s inside
      </a>
    </div>
  )
}
