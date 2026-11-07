import { CourseLinks, CourseMark } from '@/components/CourseLinks'
import { COURSE_NAME, COURSE_PREORDER_NOTE } from '@/lib/offers'

// End-of-article course offer for posts that don't get the free guide.
export default function CourseCallout({ slug }: { slug: string }) {
  return (
    <section
      aria-label={COURSE_NAME}
      className="relative overflow-hidden bg-gradient-to-br from-sky-900/40 to-blue-900/40 border border-sky-500/30 rounded-2xl p-8 my-12"
    >
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          <CourseMark />
          {COURSE_NAME} · Pre-orders open
        </div>

        <h3 className="text-2xl font-bold text-white mb-3">
          Ship production-ready BLE apps with Flutter.
        </h3>
        <p className="text-slate-300 mb-2 leading-relaxed max-w-xl">
          A complete Flutter course on Bluetooth Low Energy: scanning, connection management, GATT communication,
          a production-ready app architecture and OTA firmware updates for ESP32.
        </p>
        <p className="text-sm text-slate-400 mb-6">{COURSE_PREORDER_NOTE}</p>

        <CourseLinks content={slug} term="end" />
      </div>
    </section>
  )
}
