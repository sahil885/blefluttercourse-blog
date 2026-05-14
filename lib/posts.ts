import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'content/posts')

export interface FAQ {
  question: string
  answer: string
}

export interface Post {
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
  readTime: string
  tags: string[]
  faqs: FAQ[]
}

export function getAllPosts(): Omit<Post, 'content'>[] {
  const fileNames = fs.readdirSync(postsDirectory)
  const posts = fileNames
    .filter((name) => name.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '')
      const fullPath = path.join(postsDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)
      const wordCount = content.split(/\s+/).length
      const readTime = `${Math.ceil(wordCount / 200)} min read`
      return {
        slug,
        title: data.title as string,
        date: data.date as string,
        excerpt: data.excerpt as string,
        readTime,
        tags: (data.tags as string[]) || [],
        faqs: (data.faqs as FAQ[]) || [],
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return posts
}

export function getPostBySlug(slug: string): Post {
  const fullPath = path.join(postsDirectory, `${slug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)
  const wordCount = content.split(/\s+/).length
  const readTime = `${Math.ceil(wordCount / 200)} min read`

  return {
    slug,
    title: data.title as string,
    date: data.date as string,
    excerpt: data.excerpt as string,
    content,
    readTime,
    tags: (data.tags as string[]) || [],
    faqs: (data.faqs as FAQ[]) || [],
  }
}

export function getAllSlugs(): string[] {
  const fileNames = fs.readdirSync(postsDirectory)
  return fileNames.filter((name) => name.endsWith('.md')).map((name) => name.replace(/\.md$/, ''))
}
