// Tells IndexNow (Bing, Yandex, Seznam, Naver and others) about new or updated pages
// after each production build on Vercel. Runs as the `postbuild` script.
//
// It submits the homepage, /blog, and every post whose `date` or `updated` frontmatter
// falls within the last RECENT_DAYS days. Re-submitting an unchanged URL is harmless.
// Set INDEXNOW_ALL=1 to submit every URL once (for example after a site-wide change).
//
// This script never fails the build: any error is logged and the build continues.

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const HOST = 'blog.blefluttercourse.com'
const BASE_URL = `https://${HOST}`
const KEY = '39eaa55f5ba91bf49f570a9c3325ecb1'
const RECENT_DAYS = 7

async function main() {
  if (process.env.VERCEL_ENV !== 'production') {
    console.log('[indexnow] Skipped: not a Vercel production build.')
    return
  }

  const keyFile = path.join(process.cwd(), 'public', `${KEY}.txt`)
  if (!fs.existsSync(keyFile) || fs.readFileSync(keyFile, 'utf8').trim() !== KEY) {
    console.log('[indexnow] Skipped: key file missing or its contents do not match the key.')
    return
  }

  const postsDir = path.join(process.cwd(), 'content', 'posts')
  const submitAll = process.env.INDEXNOW_ALL === '1'
  const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000

  const postUrls = fs
    .readdirSync(postsDir)
    .filter((name) => name.endsWith('.md'))
    .filter((name) => {
      if (submitAll) return true
      const { data } = matter(fs.readFileSync(path.join(postsDir, name), 'utf8'))
      const changed = new Date(data.updated ?? data.date).getTime()
      return Number.isFinite(changed) && changed >= cutoff
    })
    .map((name) => `${BASE_URL}/blog/${name.replace(/\.md$/, '')}`)

  const urlList = [BASE_URL, `${BASE_URL}/blog`, ...postUrls]
  if (submitAll) urlList.push(`${BASE_URL}/free-guide`)

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `${BASE_URL}/${KEY}.txt`,
      urlList,
    }),
    signal: AbortSignal.timeout(15000),
  })

  // 200 and 202 both mean the submission was accepted.
  console.log(`[indexnow] Submitted ${urlList.length} URL(s): HTTP ${res.status}`)
  for (const url of urlList) console.log(`[indexnow]   ${url}`)
}

main().catch((err) => {
  console.log(`[indexnow] Submission failed, continuing the build: ${err?.message ?? err}`)
})
