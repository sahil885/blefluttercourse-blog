import { getAllPosts } from '@/lib/posts'

const BASE_URL = 'https://blog.blefluttercourse.com'

export default function sitemap() {
  const posts = getAllPosts()

  // The homepage and /blog change when a post is added or updated, so they take the
  // newest post date rather than the build time.
  const newestPostDate = new Date(
    Math.max(...posts.map((post) => new Date(post.updated ?? post.date).getTime()))
  )

  const postEntries = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updated ?? post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: newestPostDate,
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: newestPostDate,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      // No lastModified: the page has no reliable edit date, and a fake one is worse than none.
      url: `${BASE_URL}/free-guide`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    ...postEntries,
  ]
}
