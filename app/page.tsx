import Link from 'next/link'
import PostCard from '@/components/PostCard'
import { getAllPosts } from '@/lib/posts'

export default function HomePage() {
  const posts = getAllPosts().slice(0, 3)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-950/30 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
            Flutter × Bluetooth Low Energy
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Build Real BLE Apps
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
              with Flutter
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Practical tutorials, deep dives, and code examples for Flutter developers
            building Bluetooth Low Energy powered applications — from scanning to production.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://blefluttercourse.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold px-7 py-3.5 rounded-xl transition-all shadow-xl shadow-sky-500/25 hover:-translate-y-0.5 text-base"
            >
              Join the Full Course
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-7 py-3.5 rounded-xl transition-all text-base"
            >
              Read the Blog
            </Link>
          </div>
        </div>
      </section>

      {/* Topics strip */}
      <section className="border-y border-slate-800 bg-slate-900/50 py-5 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            {[
              'BLE Fundamentals', 'flutter_blue_plus', 'GATT Profiles',
              'BLE Scanning', 'Custom Hardware', 'Background BLE',
              'BLE Security', 'iOS & Android', 'Real-world Projects',
            ].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-sky-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Latest posts */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Latest Articles</h2>
            <p className="text-slate-400">Fresh tutorials to level up your BLE skills</p>
          </div>
          <Link
            href="/blog"
            className="hidden sm:flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-medium text-sm transition-colors"
          >
            View all articles
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post.slug} {...post} />
          ))}
        </div>
      </section>

      {/* Course CTA banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900 to-blue-900 border border-sky-700/50 p-10 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(14,165,233,0.15)_0%,_transparent_70%)]" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold text-white mb-3">
              Ready to go deeper?
            </h2>
            <p className="text-sky-200 mb-8 max-w-xl mx-auto text-lg">
              The complete BLE Flutter Mastery course covers everything you need to build
              professional Bluetooth-powered apps — from fundamentals to shipping real products.
            </p>
            <a
              href="https://blefluttercourse.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-sky-900 hover:bg-sky-50 font-bold px-8 py-4 rounded-xl transition-all shadow-xl text-base"
            >
              Explore the Course →
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
