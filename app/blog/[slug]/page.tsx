import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { marked } from 'marked'
import { getAllSlugs, getPostBySlug } from '@/lib/posts'
import { getPostOffer } from '@/lib/offers'
import InlineOptIn from '@/components/InlineOptIn'
import FreeGuideCTA from '@/components/FreeGuideCTA'
import StarterBox from '@/components/StarterBox'
import StarterCallout from '@/components/StarterCallout'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const post = getPostBySlug(params.slug)
    return {
      title: post.title,
      description: post.excerpt,
      alternates: {
        canonical: `/blog/${params.slug}`,
      },
      openGraph: {
        title: post.title,
        description: post.excerpt,
        type: 'article',
        publishedTime: post.date,
        ...(post.updated ? { modifiedTime: post.updated } : {}),
        url: `/blog/${params.slug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.excerpt,
      },
    }
  } catch {
    return { title: 'Post Not Found' }
  }
}

function splitHtmlAtHeading(html: string, headingIndex: number): [string, string] {
  // Split after the Nth </h2> tag so CourseCallout appears mid-article
  let count = 0
  let splitPos = -1
  const pattern = /<\/h2>/gi
  let match
  while ((match = pattern.exec(html)) !== null) {
    count++
    if (count === headingIndex) {
      splitPos = match.index + match[0].length
      break
    }
  }
  if (splitPos === -1) return [html, '']
  return [html.slice(0, splitPos), html.slice(splitPos)]
}

const CONTAINER_TAGS = new Set(['ul', 'ol', 'li', 'blockquote', 'table', 'details'])

// Where the BLE Starter box goes: right after the first top-level code block when it comes
// early in the post, otherwise before the third section heading, otherwise after the first paragraph.
function splitHtmlForStarterBox(html: string): [string, string] {
  const tagPattern = /<(\/?)([a-z0-9]+)\b[^>]*>/gi
  let depth = 0
  let firstCodeEnd = -1
  let firstParagraphEnd = -1
  const headingStarts: number[] = []
  let match
  while ((match = tagPattern.exec(html)) !== null) {
    const closing = match[1] === '/'
    const tag = match[2].toLowerCase()
    if (CONTAINER_TAGS.has(tag)) {
      depth += closing ? -1 : 1
      continue
    }
    if (depth !== 0) continue
    const end = match.index + match[0].length
    if (closing && tag === 'pre' && firstCodeEnd === -1) firstCodeEnd = end
    if (closing && tag === 'p' && firstParagraphEnd === -1) firstParagraphEnd = end
    if (!closing && tag === 'h2') headingStarts.push(match.index)
  }

  let splitPos = firstParagraphEnd
  if (firstCodeEnd !== -1 && firstCodeEnd <= html.length * 0.4) splitPos = firstCodeEnd
  else if (headingStarts.length >= 3) splitPos = headingStarts[2]
  else if (headingStarts.length >= 2) splitPos = headingStarts[1]

  if (splitPos <= 0) return ['', html]
  return [html.slice(0, splitPos), html.slice(splitPos)]
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BlogPostPage({ params }: Props) {
  let post
  try {
    post = getPostBySlug(params.slug)
  } catch {
    notFound()
  }

  const htmlContent = marked(post.content) as string
  const offer = getPostOffer(params.slug)
  // Guide posts keep the mid-article free-guide form; every other post gets the BLE Starter box.
  const [firstHalf, secondHalf] =
    offer.kind === 'guide' ? splitHtmlAtHeading(htmlContent, 3) : splitHtmlForStarterBox(htmlContent)

  const formattedDate = formatDate(post.date)
  const formattedUpdated = post.updated ? formatDate(post.updated) : null

  // Build FAQ JSON-LD schema
  const faqSchema = post.faqs && post.faqs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }
    : null

  // Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    ...(post.updated ? { dateModified: post.updated } : {}),
    author: {
      '@type': 'Organization',
      name: 'BLE Flutter Course',
      url: 'https://blefluttercourse.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'BLE Flutter Course',
      url: 'https://blog.blefluttercourse.com',
    },
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-slate-300 transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-slate-400 truncate">{post.title}</span>
        </nav>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-5 leading-tight">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 pb-8 border-b border-slate-800 mb-10">
          <span>{formattedDate}</span>
          {formattedUpdated && (
            <>
              <span>·</span>
              <span>Updated {formattedUpdated}</span>
            </>
          )}
          <span>·</span>
          <span>{post.readTime}</span>
        </div>

        {/* First part of content */}
        {firstHalf && (
          <article
            className="prose"
            dangerouslySetInnerHTML={{ __html: firstHalf }}
          />
        )}

        {/* One main offer per post: the free guide on beginner posts, BLE Starter everywhere else */}
        {offer.kind === 'guide'
          ? secondHalf && <InlineOptIn />
          : <StarterBox slug={params.slug} lead={offer.lead} pitch={offer.pitch} />}

        {/* Rest of content */}
        {secondHalf && (
          <article
            className="prose"
            dangerouslySetInnerHTML={{ __html: secondHalf }}
          />
        )}

        {/* End-of-article offer */}
        {offer.kind === 'guide' ? <FreeGuideCTA /> : <StarterCallout slug={params.slug} />}

        {/* Back to blog */}
        <div className="mt-10 pt-8 border-t border-slate-800">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Back to Blog
          </Link>
        </div>
      </div>
    </div>
  )
}
