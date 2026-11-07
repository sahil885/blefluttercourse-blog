import { courseUrl } from '@/lib/offers'

// The star badge used on the course offer boxes.
export function CourseMark({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

// Primary "Pre-order the Course" button plus a "See the Curriculum" link, both tracked.
export function CourseLinks({ content, term }: { content: string; term: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <a
        href={courseUrl(content, term, 'pricing')}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-sky-500/25"
      >
        Pre-order the Course
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </a>
      <a
        href={courseUrl(content, term, 'curriculum')}
        target="_blank"
        rel="noopener"
        className="text-sm font-medium text-sky-300 hover:text-sky-200 underline-offset-4 hover:underline transition-colors"
      >
        See the Curriculum
      </a>
    </div>
  )
}
