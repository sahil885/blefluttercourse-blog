import Link from 'next/link'

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
              <Link
                href="/blog"
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Blog
              </Link>
            </nav>
          </div>
          <Link
            href="https://blefluttercourse.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm shadow-lg shadow-sky-500/20 hover:shadow-sky-400/30"
          >
            View Course
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
