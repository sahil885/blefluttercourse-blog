import { StarterLinks, StarterMark } from '@/components/StarterLinks'

interface StarterBoxProps {
  slug: string
  lead: string
  pitch: string
}

// Shown right after a post's first code block, with copy matched to the post.
export default function StarterBox({ slug, lead, pitch }: StarterBoxProps) {
  return (
    <aside
      aria-label="BLE Starter"
      className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-950/60 to-slate-900 p-6 sm:p-7 my-10"
    >
      <div className="absolute top-0 right-0 w-56 h-56 bg-cyan-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
          <StarterMark className="w-3.5 h-3.5" />
          BLE Starter
        </div>
        <p className="text-slate-200 leading-7 mb-5">
          <strong className="text-white font-semibold">{lead}</strong> {pitch}
        </p>
        <StarterLinks content={slug} term="box" />
      </div>
    </aside>
  )
}
