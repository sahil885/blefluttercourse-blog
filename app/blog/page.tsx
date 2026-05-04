import type { Metadata } from 'next'
import PostCard from '@/components/PostCard'
import { getAllPosts } from '@/lib/posts'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Tutorials, guides, and deep dives on building Bluetooth Low Energy apps with Flutter. Learn flutter_blue_plus, GATT profiles, BLE scanning, and more.',
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-white mb-3">BLE Flutter Blog</h1>
        <p className="text-xl text-slate-400 max-w-2xl">
          Tutorials, deep dives, and practical guides for Flutter developers building
          Bluetooth Low Energy applications.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-slate-500">No posts yet. Check back soon!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post.slug} {...post} />
          ))}
        </div>
      )}
    </div>
  )
}
