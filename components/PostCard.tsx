import Link from 'next/link'

interface PostCardProps {
  slug: string
  title: string
  excerpt: string
  date: string
  readTime: string
  tags: string[]
}

export default function PostCard({ slug, title, excerpt, date, readTime, tags }: PostCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Link href={`/blog/${slug}`} className="group block">
      <article className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full hover:border-sky-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/5">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h2 className="text-xl font-bold text-slate-100 mb-3 group-hover:text-sky-400 transition-colors leading-snug">
          {title}
        </h2>

        <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3">{excerpt}</p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{formattedDate}</span>
            <span>·</span>
            <span>{readTime}</span>
          </div>
          <span className="text-sky-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
            Read
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>
      </article>
    </Link>
  )
}
