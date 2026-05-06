import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: {
    default: 'BLE Flutter Course — Learn Bluetooth Low Energy with Flutter',
    template: '%s | BLE Flutter Course',
  },
  description:
    'Practical tutorials and guides for Flutter developers working with Bluetooth Low Energy. Master BLE scanning, GATT profiles, real device communication, and more.',
  metadataBase: new URL('https://blog.blefluttercourse.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://blog.blefluttercourse.com',
    siteName: 'BLE Flutter Course',
    title: 'BLE Flutter Course — Learn Bluetooth Low Energy with Flutter',
    description:
      'Practical tutorials and guides for Flutter developers working with Bluetooth Low Energy.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BLE Flutter Course',
    description: 'Learn to build professional BLE-powered Flutter apps.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');`,
              }}
            />
          </>
        )}
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
