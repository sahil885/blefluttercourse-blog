'use client'

import { useEffect } from 'react'

export default function CtaTracker() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a[href*="start.sahilbora.com"]') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') || ''
      let eventName = ''
      if (href.includes('/consultcall')) eventName = 'consult_call_click'
      else if (href.includes('/booking')) eventName = 'dfy_dev_click'
      else return
      const w = window as Window & { gtag?: (...args: unknown[]) => void }
      if (typeof w.gtag === 'function') {
        w.gtag('event', eventName, {
          link_url: href,
          link_text: (anchor.textContent || '').trim().slice(0, 100),
          cta_location: window.location.pathname,
        })
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  return null
}
