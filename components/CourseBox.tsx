import { CourseLinks, CourseMark } from '@/components/CourseLinks'
import { COURSE_NAME, COURSE_PREORDER_NOTE } from '@/lib/offers'

interface CourseBoxProps {
  slug: string
  lead: string
  pitch: string
}

// Shown early in a post (after its first code block), with copy matched to the post.
export default function CourseBox({ slug, lead, pitch }: CourseBoxProps) {
  return (
    <aside
      aria-label={COURSE_NAME}
      className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-900/40 to-slate-900 p-6 sm:p-7 my-10"
    >
      <div className="absolute top-0 right-0 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
          <CourseMark />
          {COURSE_NAME} · Pre-orders open
        </div>
        <p className="text-slate-200 leading-7 mb-2">
          <strong className="text-white font-semibold">{lead}</strong> {pitch}
        </p>
        <p className="text-sm text-slate-400 mb-5">{COURSE_PREORDER_NOTE}</p>
        <CourseLinks content={slug} term="box" />
      </div>
    </aside>
  )
}
