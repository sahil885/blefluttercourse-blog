import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Flutter BLE Guide: Why Your App Keeps Disconnecting [Fix It]',
  description: 'Free guide for Flutter developers: discover the 7 BLE architecture mistakes causing unstable connections and get production-ready fixes you can apply today.',
  alternates: {
    canonical: '/free-guide',
  },
  openGraph: {
    title: 'Free Flutter BLE Guide: Why Your App Keeps Disconnecting',
    description: 'Join 1,000+ Flutter developers who fixed their BLE connection issues with this free guide. Instant download.',
    type: 'website',
    url: '/free-guide',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Flutter BLE Guide: Fix Disconnecting BLE Apps',
    description: 'The 7 BLE architecture mistakes Flutter developers make — and how to fix them.',
  },
  keywords: ['flutter ble guide', 'flutter bluetooth disconnect fix', 'flutter_blue_plus tutorial', 'flutter ble course free'],
}

export default function FreeGuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
