import Link from 'next/link'
import PostCard from '@/components/PostCard'
import { getAllPosts } from '@/lib/posts'
import { courseUrl, COURSE_NAME, COURSE_PRICE, COURSE_FULL_PRICE, COURSE_LAUNCH } from '@/lib/offers'

// Core guides, in the order a new Flutter BLE developer should read them.
// The label is the link text, so it carries each page's main keyword.
const HUBS: { slug: string; label: string; blurb: string }[] = [
  { slug: 'getting-started-ble-flutter', label: 'Flutter Bluetooth Low Energy tutorial', blurb: 'Your first BLE example in Flutter, from adapter state to a connected device.' },
  { slug: 'ble-gatt-profiles-explained', label: 'BLE GATT profiles explained', blurb: 'Services, characteristics and descriptors, and how flutter_blue_plus maps to them.' },
  { slug: 'flutter-ble-permissions-android-ios', label: 'Flutter BLE permissions on Android 12+ and iOS', blurb: 'The manifest, Info.plist and runtime permissions you need before you scan.' },
  { slug: 'flutter-ble-scanning-guide', label: 'Flutter BLE scanning with flutter_blue_plus', blurb: 'startScan, scanResults, filters and the scan settings that actually matter.' },
  { slug: 'flutter-ble-read-write-characteristics', label: 'Read and write BLE characteristics in Flutter', blurb: 'Reads, writes with and without response, and subscribing to notifications.' },
  { slug: 'build-complete-flutter-ble-app', label: 'Build a complete Flutter BLE app', blurb: 'An end-to-end walkthrough that ties scanning, connecting and data together.' },
  { slug: 'flutter-ble-packages-comparison', label: 'Flutter BLE packages compared', blurb: 'flutter_blue_plus against the alternatives, and when to pick each one.' },
  { slug: 'flutter-blue-vs-flutter-blue-plus', label: 'flutter_blue_plus license and free alternatives', blurb: 'What the license costs and the free options if it does not fit your project.' },
  { slug: 'esp32-vs-arduino-flutter-ble', label: 'ESP32 vs Arduino for Flutter BLE projects', blurb: 'Which board to pair with your Flutter app, and why.' },
]

// Every other guide, grouped by topic so the homepage links to the whole blog.
// A post that isn't listed here still appears under "More guides".
const TOPICS: { name: string; slugs: string[] }[] = [
  { name: 'Connections and reliability', slugs: ['flutter-ble-keeps-disconnecting', 'flutter-ble-auto-reconnect', 'flutter-ble-background-mode-ios-android', 'flutter-ble-multiple-devices', 'flutter-ble-bonding-pairing-security'] },
  { name: 'Data and GATT', slugs: ['flutter-ble-notifications-vs-indications', 'flutter-ble-mtu-negotiation-large-data-transfer', 'ble-uuid-custom-service-flutter', 'flutter-ble-peripheral-mode', 'flutter-ble-heart-rate-monitor'] },
  { name: 'Hardware and firmware', slugs: ['flutter-ble-ota-firmware-update-esp32', 'flutter-ble-project-ideas', 'ble-vs-wifi-flutter-iot', 'ble-vs-classic-bluetooth-flutter'] },
  { name: 'Architecture, testing and debugging', slugs: ['flutter-ble-state-management-riverpod-bloc', 'testing-flutter-ble-apps', 'debugging-flutter-ble-nrf-connect', 'migrate-flutter-blue-plus-to-universal-ble'] },
  { name: 'Choosing your stack', slugs: ['flutter-vs-react-native-ble', 'flutter-ble-vs-native-android-kotlin', 'best-flutter-ble-course-2026', 'how-long-to-learn-flutter-ble'] },
]

export default function HomePage() {
  const allPosts = getAllPosts()
  const posts = allPosts.slice(0, 3)
  const bySlug = new Map(allPosts.map((p) => [p.slug, p]))
  const hubs = HUBS.filter((h) => bySlug.has(h.slug))
  const grouped = new Set([...HUBS.map((h) => h.slug), ...TOPICS.flatMap((t) => t.slugs)])
  const topics = [
    ...TOPICS.map((t) => ({ name: t.name, posts: t.slugs.flatMap((s) => bySlug.get(s) ?? []) })),
    { name: 'More guides', posts: allPosts.filter((p) => !grouped.has(p.slug)) },
  ].filter((t) => t.posts.length > 0)

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
              href={courseUrl('home', 'hero', 'pricing')}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold px-7 py-3.5 rounded-xl transition-all shadow-xl shadow-sky-500/25 hover:-translate-y-0.5 text-base"
            >
              Pre-order the Course
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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

          <p className="mt-6 text-sm text-slate-500">
            {COURSE_NAME} is open for pre-orders: {COURSE_PRICE} (normally {COURSE_FULL_PRICE}), out {COURSE_LAUNCH}.{' '}
            <Link href="/free-guide" className="text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline">
              Or get the free BLE disconnection guide
            </Link>
          </p>
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

      {/* Core guides: crawlable links to the hub posts */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20" aria-labelledby="core-guides">
        <div className="mb-10">
          <h2 id="core-guides" className="text-3xl font-bold text-white mb-1">Start Here: Core Flutter BLE Guides</h2>
          <p className="text-slate-400">The essentials of Bluetooth Low Energy with flutter_blue_plus, in reading order.</p>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hubs.map((hub, i) => (
            <li key={hub.slug}>
              <Link
                href={`/blog/${hub.slug}`}
                className="group flex gap-4 h-full bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-sky-500/50 transition-all"
              >
                <span className="flex-none w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-semibold text-slate-100 group-hover:text-sky-400 transition-colors leading-snug mb-1">
                    {hub.label}
                  </span>
                  <span className="block text-sm text-slate-400 leading-relaxed">{hub.blurb}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* All guides by topic */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20" aria-labelledby="guides-by-topic">
        <h2 id="guides-by-topic" className="text-3xl font-bold text-white mb-10">Flutter BLE Guides by Topic</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {topics.map((topic) => (
            <div key={topic.name}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-sky-400 mb-4">{topic.name}</h3>
              <ul className="space-y-3">
                {topic.posts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-slate-300 hover:text-white hover:underline underline-offset-2 leading-snug"
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Course pre-order banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900 to-blue-900 border border-sky-700/50 p-10 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(14,165,233,0.15)_0%,_transparent_70%)]" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold text-white mb-3">
              Ready to go deeper?
            </h2>
            <p className="text-sky-200 mb-8 max-w-xl mx-auto text-lg">
              {COURSE_NAME} is a complete course on building production BLE apps with Flutter,
              from BLE fundamentals to an OTA firmware updater for ESP32. Pre-order for{' '}
              {COURSE_PRICE} (normally {COURSE_FULL_PRICE}). It&apos;s out {COURSE_LAUNCH}.
            </p>
            <a
              href={courseUrl('home', 'banner', 'pricing')}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 bg-white text-sky-900 hover:bg-sky-50 font-bold px-8 py-4 rounded-xl transition-all shadow-xl text-base"
            >
              Pre-order the Course →
            </a>
          </div>
        </div>
      </section>

      {/* Work-with-me CTAs */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 to-teal-900 border border-emerald-700/50 p-8 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.15)_0%,_transparent_70%)]" />
            <div className="relative">
              <h2 className="text-2xl font-extrabold text-white mb-3">
                Stuck on a BLE problem?
              </h2>
              <p className="text-emerald-100 mb-8 max-w-md mx-auto">
                Book a 1:1 consult call for expert help with your BLE architecture, a stubborn bug, or your product roadmap — and leave with a clear path forward.
              </p>
              <a
                href="https://start.sahilbora.com/consultcall"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-8 py-4 rounded-xl transition-all shadow-xl text-base"
              >
                Book a Consult Call →
              </a>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 to-purple-900 border border-violet-700/50 p-8 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.15)_0%,_transparent_70%)]" />
            <div className="relative">
              <h2 className="text-2xl font-extrabold text-white mb-3">
                Want it built for you?
              </h2>
              <p className="text-violet-100 mb-8 max-w-md mx-auto">
                Done-For-You BLE app development: I'll design and ship your production-ready Bluetooth app — connection handling, firmware integration, and all the hard parts done right.
              </p>
              <a
                href="https://start.sahilbora.com/booking"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-violet-900 hover:bg-violet-50 font-bold px-8 py-4 rounded-xl transition-all shadow-xl text-base"
              >
                Get It Built For You →
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
