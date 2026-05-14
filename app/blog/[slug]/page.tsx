import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { marked } from 'marked'
import { getAllSlugs, getPostBySlug } from '@/lib/posts'
import CourseCallout from '@/components/CourseCallout'
import FreeGuideCTA from '@/components/FreeGuideCTA'

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

export default function BlogPostPage({ params }: Props) {
  let post
  try {
    post = getPostBySlug(params.slug)
  } catch {
    notFound()
  }

  const htmlContent = marked(post.content) as string
  const [firstHalf, secondHalf] = splitHtmlAtHeading(htmlContent, 3)

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

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
        <div className="flex items-center gap-4 text-sm text-slate-500 pb-8 border-b border-slate-800 mb-10">
          <span>{formattedDate}</span>
          <span>·</span>
          <span>{post.readTime}</span>
        </div>

        {/* First half of content */}
        <article
          className="prose"
          dangerouslySetInnerHTML={{ __html: firstHalf }}
        />

        {/* Mid-article Course CTA (only shown when article is long enough) */}
        {secondHalf && <CourseCallout />}

        {/* Second half of content */}
        {secondHalf && (
          <article
            className="prose"
            dangerouslySetInnerHTML={{ __html: secondHalf }}
          />
        )}

        {/* End-of-article Course CTA */}
        <CourseCallout />

        {/* Free Guide CTA */}
        <FreeGuideCTA />

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
