import { StarterLinks, StarterMark } from '@/components/StarterLinks'

// End-of-article offer for posts whose main offer is BLE Starter.
export default function StarterCallout({ slug }: { slug: string }) {
  return (
    <section
      aria-label="BLE Starter"
      className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-950/60 to-slate-900 p-8 my-12"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          <StarterMark className="w-3.5 h-3.5" />
          BLE Starter · Founding pre-sale
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">
          Ship your BLE app without paying for a Bluetooth library licence.
        </h3>
        <p className="text-slate-300 mb-6 leading-relaxed max-w-xl">
          A production-ready Flutter starter kit with permissions, scanning, auto-reconnect, GATT data, ESP32 OTA
          updates and tests, built on BSD-licensed libraries. Founding price $99 for the first 20 builders.
        </p>
        <StarterLinks content={slug} term="end" />
      </div>
    </section>
  )
}
