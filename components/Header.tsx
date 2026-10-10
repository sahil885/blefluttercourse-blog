import Link from 'next/link'
import { starterUrl } from '@/lib/offers'
import { StarterMark } from '@/components/StarterLinks'

export default function Header() {
  return (
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                BLE
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                Flutter<span className="text-sky-400">Course</span>
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/blog" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                Blog
              </Link>
              <Link href="/free-guide" className="flex items-center gap-1.5 text-slate-400 hover:text-sky-300 transition-colors text-sm font-medium">
                <span className="bg-sky-500/20 text-sky-400 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Free</span>
                Guide
              </Link>
              <a href={starterUrl('header', 'nav')} target="_blank" rel="noopener" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                Starter Kit
              </a>
              <Link href="https://start.sahilbora.com/consultcall" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                Consult Call
              </Link>
              <Link href="https://start.sahilbora.com/booking" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                Hire Me
              </Link>
              </nav>
          </div>
          <a
            href={starterUrl('header', 'menu')}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold px-4 py-2 rounded-lg transition-all text-sm shadow-lg shadow-cyan-500/20"
          >
            <StarterMark className="w-3.5 h-3.5" />
            BLE Starter
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  )
}

