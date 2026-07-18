'use client'

import { useState } from 'react'

export default function InlineOptIn() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', email: email.trim() }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 my-12">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          Free Guide
        </div>
        {status === 'success' ? (
          <div>
            <h3 className="text-white text-xl font-bold mb-2">Check your inbox!</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              &quot;Why Your BLE App Keeps Disconnecting&quot; is on its way to your email.
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-white text-xl font-bold mb-2">Why Your BLE App Keeps Disconnecting</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              The 7 architecture mistakes behind unstable BLE connections — with clean,
              production-ready fixes. Free, straight to your inbox.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 bg-slate-900/70 border border-slate-700 focus:border-emerald-500 text-white placeholder-slate-500 px-4 py-3 rounded-lg text-sm outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="shrink-0 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-lg transition-all text-sm shadow-lg shadow-emerald-500/20"
              >
                {status === 'loading' ? 'Sending…' : 'Send Me the Guide'}
              </button>
            </form>
            {status === 'error' && (
              <p className="text-red-400 text-xs mt-2">Something went wrong — please try again.</p>
            )}
            <p className="text-slate-500 text-xs mt-3">No spam. Unsubscribe anytime.</p>
          </>
        )}
      </div>
    </div>
  )
}
