import Link from 'next/link'

export default function FreeGuideCTA() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-2xl p-8 my-12">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            Free Download
          </div>
          <h3 className="text-white text-xl font-bold mb-2">Why Your BLE App Keeps Disconnecting</h3>
          <p className="text-slate-400 text-sm leading-relaxed">Get the free guide covering the 7 most common BLE disconnect causes — with clean, production-ready fixes you can apply today. Join 1,000+ Flutter developers who have already grabbed it.</p>
        </div>
        <Link href="/free-guide" className="shrink-0 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-3 rounded-lg transition-all text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 whitespace-nowrap">
          Get the Free Guide
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </Link>
      </div>
    </div>
  )
}
