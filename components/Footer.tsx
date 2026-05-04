import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                BLE
              </div>
              <span className="text-white font-bold text-lg">
                Flutter<span className="text-sky-400">Course</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Practical BLE + Flutter tutorials for developers who want to build real-world
              Bluetooth-powered applications.
            </p>
          </div>

          <div>
            <h3 className="text-slate-200 font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">
                  Blog
                </Link>
              </li>
              <li>
                <a
                  href="https://blefluttercourse.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-sky-400 transition-colors text-sm"
                >
                  The Course →
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-slate-200 font-semibold mb-4">Popular Topics</h3>
            <ul className="space-y-2">
              {['BLE Scanning', 'GATT Profiles', 'flutter_blue_plus', 'BLE Security', 'Custom Hardware'].map(
                (topic) => (
                  <li key={topic}>
                    <span className="text-slate-400 text-sm">{topic}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} BLE Flutter Course. All rights reserved.
          </p>
          <p className="text-slate-500 text-sm">
            Built for Flutter developers who build with Bluetooth.
          </p>
        </div>
      </div>
    </footer>
  )
}
